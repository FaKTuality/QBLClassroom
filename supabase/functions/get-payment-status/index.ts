import {
  SignJWT,
  importPKCS8,
  importX509,
  decodeProtectedHeader,
  jwtVerify,
  type JWTPayload,
} from "jose";

const ALLOWED_ORIGIN = "https://qblclassroom.com";
const LOCALHOST_ORIGIN_PATTERN = /^http:\/\/localhost:\d+$/;

function getCorsHeaders(origin: string | null) {
  const allowOrigin =
    origin === ALLOWED_ORIGIN || (origin && LOCALHOST_ORIGIN_PATTERN.test(origin))
      ? origin
      : ALLOWED_ORIGIN;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const key = Deno.env.get("SERVICE_ACCOUNT_PRIVATE_KEY");
const PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID");

if (!key) {
  throw new Error("SERVICE_ACCOUNT_PRIVATE_KEY is not configured.");
}

if (!PROJECT_ID) {
  throw new Error("FIREBASE_PROJECT_ID is not configured.");
}

const privateKey = await importPKCS8(key, "RS256");

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

  const certs: FirebaseCertificates =
    await certResponse.json();

  const cert = certs[kid];

  if (!cert) {
    throw new Error("Invalid Firebase token key ID.");
  }

  const publicKey = await importX509(cert, "RS256");

  const { payload } = await jwtVerify(
    idToken,
    publicKey,
    {
      issuer:
        `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    }
  );

  return payload as FirebaseTokenPayload;
}

async function getFirestoreAccessToken(): Promise<string> {
  const signedJWT = await new SignJWT({
    scope:
      "https://www.googleapis.com/auth/datastore",
  })
    .setProtectedHeader({
      alg: "RS256",
      typ: "JWT",
    })
    .setIssuer(
      "firebase-adminsdk-fbsvc@joshuaqbl.iam.gserviceaccount.com"
    )
    .setAudience(
      "https://oauth2.googleapis.com/token"
    )
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
      "Could not obtain Firestore access token."
    );
  }

  const tokenData: GoogleTokenResponse =
    await tokenResponse.json();

  if (!tokenData.access_token) {
    throw new Error(
      "Firestore access token was not returned."
    );
  }

  return tokenData.access_token;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(
      JSON.stringify({
        error: "ok",
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  }

  try {
    /*
     * Authenticate the Firebase user.
     */
    const authHeader =
      req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized.",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const idToken = authHeader.substring(7);

    const decodedToken =
      await verifyFirebaseIdToken(idToken);

    const uid =
      decodedToken.user_id ??
      decodedToken.sub;

    if (!uid) {
      return new Response(
        JSON.stringify({
          error: "Invalid authentication token.",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    /*
     * Obtain a server-side Firestore access token.
     */
    const accessToken =
      await getFirestoreAccessToken();

    const FIRESTORE_BASE =
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

    /*
     * First check whether this user is a tutor.
     *
     * If admin/{uid} exists, the user is a tutor.
     */
    const tutorDocumentUrl =
      `${FIRESTORE_BASE}/admin/${encodeURIComponent(
        uid
      )}`;

    const tutorResponse = await fetch(
      tutorDocumentUrl,
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      }
    );

    let tutorId = uid;

    /*
     * If admin/{uid} does not exist, treat the user
     * as a student and find their tutorId.
     */
    if (!tutorResponse.ok) {
      if (tutorResponse.status !== 404) {
        throw new Error(
          "Could not determine user role."
        );
      }

      const studentDocumentUrl =
        `${FIRESTORE_BASE}/users/${encodeURIComponent(
          uid
        )}`;

      const studentResponse = await fetch(
        studentDocumentUrl,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
        }
      );

      if (!studentResponse.ok) {
        if (studentResponse.status === 404) {
          return new Response(
            JSON.stringify({
              hasAdFree: false,
            }),
            {
              status: 200,
              headers: {
                "Content-Type":
                  "application/json",
                ...corsHeaders,
              },
            }
          );
        }

        throw new Error(
          "Could not retrieve student account."
        );
      }

      const studentData =
        await studentResponse.json();

      tutorId =
        studentData.fields?.tutorId?.stringValue;

      if (!tutorId) {
        return new Response(
          JSON.stringify({
            hasAdFree: false,
          }),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json",
              ...corsHeaders,
            },
          }
        );
      }
    }

    /*
     * The entitlement belongs to the tutor.
     *
     * This document is intentionally read only by the
     * server so clients do not need direct access to it.
     */
    const paymentPrivateDocumentUrl =
      `${FIRESTORE_BASE}/admin/${encodeURIComponent(
        tutorId
      )}/payment/private`;

    const paymentResponse = await fetch(
      paymentPrivateDocumentUrl,
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      }
    );

    /*
     * No payment document means the tutor has not
     * purchased AD_FREE.
     */
    if (paymentResponse.status === 404) {
      return new Response(
        JSON.stringify({
          hasAdFree: false,
        }),
        {
          status: 200,
          headers: {
            "Content-Type":
              "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    if (!paymentResponse.ok) {
      throw new Error(
        "Could not retrieve payment status."
      );
    }

    const paymentData =
      await paymentResponse.json();

    const hasAdFree =
      paymentData.fields?.hasAdFree?.booleanValue ===
      true;

    return new Response(
      JSON.stringify({
        hasAdFree,
      }),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: unknown) {
    console.error(
      "Payment status check failed:",
      error
    );

    return new Response(
      JSON.stringify({
        error: "Internal server error.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type":
            "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});