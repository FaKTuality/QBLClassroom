import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../../Firebase/index.js";

const functions = getFunctions(app); 

const createCheckoutTransaction = httpsCallable(
  functions,
  "createCheckoutTransaction"
);

export default function RemoveAds() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRemoveAds = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await createCheckoutTransaction({
        product: "AD_FREE",
      });

      window.location.href = result.data.authorizationUrl;
    } catch (error) {
      console.error(error);
      setError("Unable to start payment. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="remove-ads-page">
      <section className="remove-ads-card">

        <h1 className="remove-ads-title">
          Remove Ads
        </h1>

        <p className="remove-ads-description">
          Enjoy QBL Classroom without advertisements.
        </p>

        <div className="remove-ads-benefits">
          <h3>Ad-Free Access</h3>

          <ul>
            <li>No advertisements</li>
            <li>No interruptions while using QBL Classroom</li>
            <li><strong>Permanent</strong> ad-free experience</li>
          </ul>
        </div>

        <div className="remove-ads-pricing">
          <span className="remove-ads-product">
            Ad-Free Access
          </span>

          <strong className="remove-ads-price">
            $4.99
          </strong>

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
          className="button"
          onClick={handleRemoveAds}
          disabled={loading}
        >
          {loading
            ? "Starting payment..."
            : "Remove Ads"}
        </button>

        <p className="remove-ads-note">
          You will be redirected to Paystack to complete your payment.
        </p>

      </section>
    </main>
  );
}