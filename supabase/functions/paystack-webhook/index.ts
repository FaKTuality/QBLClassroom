import {
  SignJWT,
  importPKCS8,
} from "jose";

const key = Deno.env.get("SERVICE_ACCOUNT_PRIVATE_KEY");
const PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID");
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");


if (!key) {
  throw new Error("SERVICE_ACCOUNT_PRIVATE_KEY is not set.");
}

const privateKey = await importPKCS8(key, "RS256");

const FIRESTORE_BASE =
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;


async function getFirestoreAccessToken() {
  const signedJWT = await new SignJWT({
    scope: "https://www.googleapis.com/auth/datastore", 
  })
    .setProtectedHeader({
      alg: "RS256",
      typ: "JWT",
    })
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
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type:
          "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: signedJWT,
      }),
    }
  );

  if (!tokenResponse.ok) {
    throw new Error(
      `Google OAuth failed: ${await tokenResponse.text()}`
    );
  }

  const tokenData = await tokenResponse.json();

  return tokenData.access_token;
}


async function generatePaystackSignature(body: string) {
  const encoder = new TextEncoder();

  const secretKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(PAYSTACK_SECRET_KEY),
    {
      name: "HMAC",
      hash: "SHA-512",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    secretKey,
    encoder.encode(body)
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}


function signaturesMatch(a: string, b: string) {
  if (!a || !b || a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}


Deno.serve(async (req) => {
  try {
    const signature =
      req.headers.get("x-paystack-signature");

    if (!signature) {
      return new Response(
        "Missing Paystack signature.",
        { status: 400 }
      );
    }

    /*
     * IMPORTANT:
     * Read the raw request body.
     * Do not JSON.stringify() the parsed object.
     */
    const rawBody = await req.text();

    // Verify that the webhook actually came from Paystack.
    const hash =
      await generatePaystackSignature(rawBody);

    if (!signaturesMatch(hash, signature)) {
      console.error(
        "Paystack webhook signature verification failed."
      );

      return new Response(
        "Invalid webhook signature.",
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody);

    switch (event.event) {
      case "charge.success": {
        const transaction = event.data;

        if (transaction.status !== "success") {
          break;
        }

        const uid =
          transaction.metadata?.firebaseUid;

        const product =
          transaction.metadata?.product;

        if (!uid || !product) {
          console.error(
            "Missing Firebase UID or product metadata.",
            transaction.reference
          );

          break;
        }

        if (product !== "AD_FREE") {
          console.error(
            "Unknown product:",
            product
          );

          break;
        }

        const accessToken =
          await getFirestoreAccessToken();

        /*
         * Start Firestore transaction.
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
            `Could not begin Firestore transaction: ${
              await beginResponse.text()
            }`
          );
        }

        const { transaction: transactionId } =
          await beginResponse.json();


        const userResponse = await fetch(
          `${FIRESTORE_BASE}/users/${uid}?transaction=${encodeURIComponent(
            transactionId
          )}`,
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          }
        );

        if (!userResponse.ok) {
          throw new Error(
            `User ${uid} does not exist.`
          );
        }

        const user = await userResponse.json();

        /*
         * Firestore REST represents fields using
         * typed values.
         */
        const hasAdFree =
          user.fields?.hasAdFree?.booleanValue === true;

        if (hasAdFree) {
          /*
           * The user already has AD_FREE.
           * Nothing further needs to be written.
           */
          break;
        }

        const reference =
          transaction.reference;

        const userDocumentName =
          `${FIRESTORE_BASE}/users/${uid}`;

        const paymentDocumentName =
          `${FIRESTORE_BASE}/payments/${reference}`;

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
                    name: userDocumentName,

                    fields: {
                      ...user.fields,

                      hasAdFree: {
                        booleanValue: true,
                      },

                      adFreePurchasedAt: {
                        timestampValue:
                          new Date().toISOString(),
                      },
                    },
                  },
                },

                {
                  update: {
                    name: paymentDocumentName,

                    fields: {
                      uid: {
                        stringValue: uid,
                      },

                      paystackReference: {
                        stringValue:
                          transaction.reference,
                      },

                      paystackTransactionId: {
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
                        stringValue: "paid",
                      },

                      product: {
                        stringValue: product,
                      },

                      createdAt: {
                        timestampValue:
                          new Date().toISOString(),
                      },
                    },
                  },
                },
              ],
            }),
          }
        );

        if (!commitResponse.ok) {
          throw new Error(
            `Firestore commit failed: ${
              await commitResponse.text()
            }`
          );
        }

        break;
      }

      default:
        console.log(
          `Unhandled Paystack event: ${event.event}`
        );
    }

    return new Response(
      JSON.stringify({
        received: true,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "Webhook processing failed:",
      error
    );

    return new Response(
      "Webhook processing failed.",
      { status: 500 }
    );
  }
});