import {
  SignJWT,
  importPKCS8,
  importX509,
  decodeProtectedHeader,
  jwtVerify,
  type JWTPayload,
} from "jose";

const key = Deno.env.get("SERVICE_ACCOUNT_PRIVATE_KEY");
const PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID");

if (!key) {
  throw new Error("SERVICE_ACCOUNT_PRIVATE_KEY is not configured.");
}

if (!PROJECT_ID) {
  throw new Error("FIREBASE_PROJECT_ID is not configured.");
}

const privateKey = await importPKCS8(key, "RS256");

interface PaystackMetadata {
  firebaseUid?: string;
  product?: string;
}

interface PaystackTransaction {
  id: number;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  metadata?: PaystackMetadata;
}

interface PaystackVerifyResponse {
  status: boolean;
  message?: string;
  data: PaystackTransaction;
}

interface FirebaseTokenPayload extends JWTPayload {
  user_id?: string;
  email?: string;
}

interface FirebaseCertificates {
  [kid: string]: string;
}

interface GoogleTokenResponse {
  access_token?: string;
}

async function verifyFirebaseIdToken(
  idToken: string
): Promise<FirebaseTokenPayload> {
  const { kid } = decodeProtectedHeader(idToken);

  if (!kid) {
    throw new Error("Firebase token does not contain a key ID.");
  }

  const certResponse = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
  );

  if (!certResponse.ok) {
    throw new Error("Could not retrieve Firebase public keys.");
  }

  const certs: FirebaseCertificates = await certResponse.json();
  const cert = certs[kid];

  if (!cert) {
    throw new Error("Invalid Firebase token key ID.");
  }

  const publicKey = await importX509(cert, "RS256");

  const { payload } = await jwtVerify(idToken, publicKey, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  });

  return payload as FirebaseTokenPayload;
}

async function getFirestoreAccessToken(): Promise<string> {
  const signedJWT = await new SignJWT({
    scope: "https://www.googleapis.com/auth/datastore",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(
      "firebase-adminsdk-fbsvc@joshuaqbl.iam.gserviceaccount.com"
    )
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);

  const tokenResponse = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type:
          "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: signedJWT,
      }),
    }
  );

  if (!tokenResponse.ok) {
    throw new Error("Could not obtain Firestore access token.");
  }

  const tokenData: GoogleTokenResponse =
    await tokenResponse.json();

  if (!tokenData.access_token) {
    throw new Error("Firestore access token was not returned.");
  }

  return tokenData.access_token;
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized.", {
        status: 401,
      });
    }

    const idToken = authHeader.substring(7);

    const decodedToken =
      await verifyFirebaseIdToken(idToken);

    const uid = decodedToken.user_id ?? decodedToken.sub;
    const email = decodedToken.email;

    if (!uid || !email) {
      return new Response("Invalid authentication token.", {
        status: 401,
      });
    }

    const body: { reference?: string } = await req.json();
    const { reference } = body;

    if (!reference) {
      return new Response(
        JSON.stringify({
          error: "Transaction reference is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * Ask Paystack directly whether the transaction succeeded.
     */
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        headers: {
          Authorization: `Bearer ${Deno.env.get(
            "PAYSTACK_SECRET_KEY"
          )}`,
        },
      }
    );

    const paystackResult: PaystackVerifyResponse =
      await paystackResponse.json();

    if (!paystackResponse.ok || !paystackResult.status) {
      return new Response(
        JSON.stringify({
          error:
            paystackResult.message ??
            "Unable to verify payment with Paystack.",
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const transaction = paystackResult.data;

    /*
     * The transaction itself must be successful.
     */
    if (transaction.status !== "success") {
      return new Response(
        JSON.stringify({
          error: "Payment was not successful.",
          status: transaction.status,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * Make sure this transaction belongs to the
     * authenticated Firebase user.
     */
    if (transaction.metadata?.firebaseUid !== uid) {
      return new Response(
        JSON.stringify({
          error: "Payment does not belong to this user.",
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (transaction.metadata?.product !== "AD_FREE") {
      return new Response(
        JSON.stringify({
          error: "Invalid product.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * Obtain Firestore access token.
     */
    const accessToken =
      await getFirestoreAccessToken();

    /*
     * Perform the user entitlement update and payment record
     * atomically in a Firestore transaction.
     */
    const FIRESTORE_BASE =
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

    const FIRESTORE_DOC_BASE =`projects/${PROJECT_ID}/databases/(default)/documents`;      

    const paymentDocumentUrl =
      `${FIRESTORE_DOC_BASE}/payments/${encodeURIComponent(reference)}`;

    const tutorDocumentUrl =
      `${FIRESTORE_DOC_BASE}/admin/${encodeURIComponent(uid)}`;

    const transactionTimestamp =
      new Date().toISOString();

    let committed = false;

    for (let attempt = 0; attempt < 3 && !committed; attempt++) {
      /*
       * Begin the Firestore transaction.
       */
      const beginResponse = await fetch(
        `${FIRESTORE_BASE}:beginTransaction`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            options: {},
          }),
        }
      );

      if (!beginResponse.ok) {
        throw new Error(
          "Could not begin Firestore transaction."
        );
      }

      const { transaction: transactionId } =
        await beginResponse.json();

      /*
       * Read the payment document and user document
       * within the transaction.
       */
      const batchGetResponse = await fetch(
        `${FIRESTORE_BASE}:batchGet`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            documents: [
              paymentDocumentUrl,
              tutorDocumentUrl,
            ],
            transaction: transactionId,
          }),
        }
      );

      if (!batchGetResponse.ok) {
        await fetch(
          `${FIRESTORE_BASE}:rollback`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              transaction: transactionId,
            }),
          }
        );        
        throw new Error(
          "Could not read Firestore documents."
        );
      }

      const documents =
        await batchGetResponse.json();

      let paymentExists = false;
      let tutorExists = false;

      for (const result of documents) {
        if (result.found?.name ===
          paymentDocumentUrl) {
          paymentExists = true;
        }

        if (result.found?.name ===
          tutorDocumentUrl) {
          tutorExists = true;
        }
      }

      if (!tutorExists) {
        await fetch(
          `${FIRESTORE_BASE}:rollback`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              transaction: transactionId,
            }),
          }
        );          
        throw new Error(
          "User account was not found."
        );
      }

      /*
       * The payment reference is the idempotency key.
       *
       * If this reference has already been processed,
       * there is nothing more to write.
       */
      if (paymentExists) {
        await fetch(
          `${FIRESTORE_BASE}:rollback`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              transaction: transactionId,
            }),
          }
        );

        return new Response(
          JSON.stringify({
            success: true,
            message: "Payment was already processed.",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      /*
       * Commit both writes atomically.
       */
      const commitResponse = await fetch(
        `${FIRESTORE_BASE}:commit`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            transaction: transactionId,

            writes: [
              {
                update: {
                  name: tutorDocumentUrl,
                  fields: {
                    hasAdFree: {
                      booleanValue: true,
                    },
                    adFreePurchasedAt: {
                      timestampValue:
                        transactionTimestamp,
                    },
                  },
                },

                updateMask: {
                  fieldPaths: [
                    "hasAdFree",
                    "adFreePurchasedAt",
                  ],
                },
              },

              {
                update: {
                  name: paymentDocumentUrl,
                  fields: {
                    firebaseUid: {
                      stringValue: uid,
                    },
                    reference: {
                      stringValue:
                        transaction.reference,
                    },
                    transactionId: {
                      integerValue:
                        String(transaction.id),
                    },
                    amount: {
                      integerValue:
                        String(transaction.amount),
                    },
                    currency: {
                      stringValue:
                        transaction.currency,
                    },
                    status: {
                      stringValue:
                        transaction.status,
                    },
                    product: {
                      stringValue:
                        transaction.metadata.product,
                    },
                    createdAt: {
                      timestampValue:
                        transactionTimestamp,
                    },
                  },
                },
              },
            ],
          }),
        }
      );

      if (commitResponse.ok) {
        committed = true;
        continue;
      }

      /*
       * Firestore can abort a transaction because another
       * transaction modified one of the documents 
       * Retry the transaction in that case.
       * The code below allows the loop to run again IF the transaction wasn't aborted. 
       */
      const commitResult =
        await commitResponse.json();

      if (
        commitResponse.status !== 409 &&
        commitResult.error?.status !== "ABORTED"
      ) {
        throw new Error(
          "Could not commit Firestore transaction."
        );
      }
    }

    if (!committed) {
      throw new Error(
        "Firestore transaction could not be committed."
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message:
          "Payment verified successfully.",
      }),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/json",
        },
      }
    );
  } catch (error: unknown) {
    console.error(error);

    return new Response("Internal server error.", {
      status: 500,
    });
  }
});