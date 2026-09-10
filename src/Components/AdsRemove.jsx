import { useEffect, useState } from "react";
import { RevolvingDot } from "react-loader-spinner";
import { useDispatch, useSelector } from "react-redux";
import { auth } from "../../Firebase/index.js";
import { setAdFreeStatus } from "../store/topicConfigSlice.js";

const PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_REF;

const SUPABASE_FUNCTION_URL =
  `https://${PROJECT_REF}.supabase.co/functions/v1`;

export default function RemoveAds() {
  const dispatch = useDispatch();

  const reduxHasAdFree = useSelector(
    (state) => state.topicConfig.hasAdFree
  );

  const [hasAdFree, setHasAdFree] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const params = new URLSearchParams(window.location.search);
  const reference = params.get("reference");

  useEffect(() => {
    const evaluatePaymentStatus = async () => {
      /*
       * The Redux state has already been populated by App.
       * This component therefore does not need to query Firestore.
       */
      setHasAdFree(reduxHasAdFree === true);

      /*
       * If Paystack redirected the user here with a reference,
       * verify that payment instead of displaying the purchase UI.
       */
      if (reference && reduxHasAdFree !== true) {
        await verifyPayment(reference);
      }
    };

    evaluatePaymentStatus();
  }, [reduxHasAdFree, reference]);

  const verifyPayment = async (reference) => {
    setLoading(true);
    setError("");

    try {
      const idToken = await auth.currentUser?.getIdToken();

      if (!idToken) {
        throw new Error("User is not authenticated.");
      }

      const response = await fetch(
        `${SUPABASE_FUNCTION_URL}/verify-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            reference,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ?? "Payment verification failed."
        );
      }

      setHasAdFree(true);
      dispatch(setAdFreeStatus(true));

      /*
       * The reference has now served its purpose.
       * Remove it so refreshing the page does not attempt
       * to verify the same Paystack redirect again.
       */
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    } catch (error) {
      console.error(error);

      setError(
        "We could not verify your payment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAds = async () => {
    setLoading(true);
    setError("");

    try {
      const idToken = await auth.currentUser?.getIdToken();

      if (!idToken) {
        throw new Error("User is not authenticated.");
      }

      const response = await fetch(
        `${SUPABASE_FUNCTION_URL}/initialize-transaction`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            product: "AD_FREE",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Payment initialization failed."
        );
      }

      window.location.href = data.authorizationUrl;
    } catch (error) {
      console.error(error);

      setError(
        "Unable to start payment. Please try again."
      );

      setLoading(false);
    }
  };

  /*
   * The component initially has no local knowledge of the
   * payment status, so show the evaluation state first.
   */
  if (hasAdFree === null) {
    return (
      <div className="loader-container">
        <RevolvingDot
          visible={true}
          height="80"
          width="80"
          color="orange"
        />
        <p>Evaluating payment status</p>
      </div>
    );
  }

  /*
   * A Paystack reference was supplied, so payment verification
   * takes precedence over the normal Remove Ads UI.
   */
  if (reference && loading) {
    return (
      <div className="loader-container">
        <RevolvingDot
          visible={true}
          height="80"
          width="80"
          color="orange"
        />
        <p>Verifying payment</p>
      </div>
    );
  }

  /*
   * Payment has already been confirmed.
   */
  if (hasAdFree) {
    return (
      <div className="remove-ads-page">
        <div className="remove-ads-card">
          <h2 className="remove-ads-title">
            Ads removed
          </h2>

          <p className="remove-ads-description">
            Your payment has been confirmed. You can now
            use QBL Classroom without advertisements.
          </p>
        </div>
      </div>
    );
  }

  /*
   * Tutor has not paid and this is not a Paystack
   * verification redirect. Display the normal purchase UI.
   */
  return (
    <div className="remove-ads-page">
      <div className="remove-ads-card">
        <h2 className="remove-ads-title">
          Remove Ads
        </h2>

        <p className="remove-ads-description">
          Enjoy QBL Classroom without advertisements.
        </p>

        <div className="remove-ads-benefits">
          <h3>Ad-Free Access</h3>

          <ul>
            <li>No advertisements</li>
            <li>No interruptions while using QBL Classroom</li>
            <li>
              <strong>Permanent</strong> ad-free experience
            </li>
          </ul>
        </div>

        <div className="remove-ads-pricing">
          <span className="remove-ads-product">
            Ad-Free Access
          </span>

          <span className="remove-ads-price">
            $4.99
          </span>

          <span className="remove-ads-frequency">
            One-time payment
          </span>
        </div>

        {error && (
          <p className="remove-ads-error">
            {error}
          </p>
        )}

        <button
          className="remove-ads-button"
          onClick={handleRemoveAds}
          disabled={loading}
        >
          {loading
            ? "Starting payment..."
            : "Remove Ads"}
        </button>

        <p className="remove-ads-note">
          You will be redirected to Paystack to complete
          your payment.
        </p>
      </div>
    </div>
  );
}