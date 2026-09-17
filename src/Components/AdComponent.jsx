
import { useEffect } from "react";

const GoogleAds = () => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error("Google AdSense error:", error);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client="ca-pub-5378908739269513"
      data-ad-slot="6789184835"
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
};

export default GoogleAds;

