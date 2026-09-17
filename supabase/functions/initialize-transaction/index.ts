import {
  SignJWT,
  importPKCS8,
  importX509,
  decodeProtectedHeader,
  jwtVerify,
} from "jose";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://qblclassroom.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};


const key = Deno.env.get("SERVICE_ACCOUNT_PRIVATE_KEY");
const PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID");

if (!key) {
  throw new Error("SERVICE_ACCOUNT_PRIVATE_KEY is not set.");
}


const privateKey = await importPKCS8(key, "RS256");

async function verifyFirebaseIdToken(idToken: string) {
  const { kid } = decodeProtectedHeader(idToken);

  const certResponse = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
  );

  if (!certResponse.ok) {
    throw new Error("Could not retrieve Firebase public keys.");
  }

  const certs = await certResponse.json();

  if (!kid) {
    throw new Error("Firebase token is missing a key ID.");
  }
  
  const cert = certs[kid];

  if (!cert) {
    throw new Error("Invalid Firebase token key ID.");
  }

  const publicKey = await importX509(cert, "RS256");

  const { payload } = await jwtVerify(idToken, publicKey, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  });

  return payload;
}

Deno.serve(async (req) => {

    if (req.method === "OPTIONS") {
    return new Response(JSON.stringify({
      error: "ok",
    }), {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({
      error: "Unauthorized",
    }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const idToken = authHeader.substring(7);

    const decodedToken = await verifyFirebaseIdToken(idToken);

    const uid = decodedToken.user_id ?? decodedToken.sub;
    const email = decodedToken.email;

    if (!uid || !email) {
      return new Response(JSON.stringify({
      error: "Invalid authentication token.",
    }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { product } = await req.json();

    if (product !== "AD_FREE") {
      return new Response(JSON.stringify({
      error: "Invalid authentication token.",
    }), { 
        status: 400 , 
        headers: corsHeaders, 
      });
    }

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

    const { access_token } = await tokenResponse.json();

    const userResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/admin/${uid}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const tutor = await userResponse.json();

    if (!userResponse.ok) {
      console.error("Firestore tutor lookup failed:", tutor);

      return new Response(
        JSON.stringify({
          error: "Tutor account was not found.",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    if (tutor.fields?.hasAdFree?.booleanValue === true) {
  return new Response(
    JSON.stringify({
      error: "Ads have already been removed for this account.",
    }),
    {
      status: 409,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders, 
      },
    }
  );
}

    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get(
            "PAYSTACK_SECRET_KEY"
          )}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: 50 * 100,
          currency: "NGN",
          channels: ["card", "bank", "bank_transfer", "ussd"],
          metadata: {
            firebaseUid: uid,
            product,
          },
          
        }),
      }
    );

    const transaction = await paystackResponse.json();

    if (!paystackResponse.ok || !transaction.status) {
      return new Response(
        JSON.stringify({
          error: transaction.message ?? "Payment initialization failed.",
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders, 
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        authorizationUrl: transaction.data.authorization_url,
        reference: transaction.data.reference,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders, 
        },
      }
    );
  } catch (error) {
    console.error(error);

    return new Response(JSON.stringify({
      error: "Internal server error.",
    }), {
      status: 500,
      headers: corsHeaders, 
    });
  }
});