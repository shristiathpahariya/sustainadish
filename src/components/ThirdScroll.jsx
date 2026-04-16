import React from "react";
import { useNavigate } from "react-router-dom";
import { useMessageDialog } from "../context/MessageDialogContext";

export default function ThirdScroll() {
  const navigate = useNavigate();
  const { notifyInfo } = useMessageDialog();

  const handleDonate = () => {
    const user = localStorage.getItem("user");
    if (!user) {
      notifyInfo("Sign in to donate and track your impact.", "Sign in required");
      navigate("/login");
    } else {
      navigate("/donationform");
    }
  };

  return (
    <>
      <section className="scrollthird scroll--donate" aria-label="Donate">
        <div className="section-inner">
          <div>
            <div className="eyebrow">Make a difference</div>
            <h2 className="message">
              Your surplus is someone else's <em>dinner</em>
            </h2>
            <p className="body-text">
              Every day, good food goes to waste while neighbours go hungry.
              SustainaDish makes it simple to donate what you can't use —
              from a bag of lentils to a home-cooked meal.
            </p>
            <button type="button" className="get-started" onClick={handleDonate}>
              Donate now
            </button>
          </div>

          <div className="impact-list">
            <div className="impact-item">
              <div className="impact-dot amber" />
              <div className="impact-text">
                List surplus ingredients or cooked meals in under 2 minutes
              </div>
            </div>
            <div className="impact-item">
              <div className="impact-dot coral" />
              <div className="impact-text">
                Neighbours nearby are notified and can claim your donation
              </div>
            </div>
            <div className="impact-item">
              <div className="impact-dot green" />
              <div className="impact-text">
                Track your total impact — meals enabled, food rescued
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="footer-cta">
        <p>"Good food, shared generously — that's the SustainaDish way."</p>
        <button type="button" className="get-started" onClick={handleDonate}>
          Join the community
        </button>
        <div className="footer-mono">SustainaDish · Est. 2024</div>
      </div>
    </>
  );
}