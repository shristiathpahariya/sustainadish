import React, { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SecondScroll from "./SecondScroll";
import { useUser } from "../UserContext";

function FirstScroll() {
  const navigate = useNavigate();
  const secondScrollRef = useRef(null);
  const { user } = useUser();
  const isLoggedIn = !!user;

  const handleCTA = () => {
    if (isLoggedIn) {
      secondScrollRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/login");
    }
  };

  const handleExplore = () => {
    secondScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <section className="landing landing--shapes" aria-label="Welcome">
        <div className="content">
          <p className="hero-sub">
            Discover recipes, reduce food waste, and donate surplus ingredients
            to neighbours who need them.
          </p>
          <div className="hero-actions">
            <button type="button" className="get-started" onClick={handleCTA}>
              {isLoggedIn ? "Explore more" : "Get started"}
            </button>
            <button type="button" className="btn-ghost" onClick={handleExplore}>
              See recipes
            </button>
          </div>
        </div>

        {/* hero stats */}
        <div className="hero-stats">
          <div>
            <div className="hero-stat-num">2.4k</div>
            <div className="hero-stat-label">Recipes shared</div>
          </div>
          <div>
            <div className="hero-stat-num">890</div>
            <div className="hero-stat-label">Meals donated</div>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <div className="feature-strip">
        <div className="feature-strip-inner">
          <div className="feature-item">
            <div className="feature-num">01</div>
            <div className="feature-title">Discover recipes</div>
            <p className="feature-desc">
              Turn whatever's in your fridge into something extraordinary.
              AI-powered suggestions from your ingredients.
            </p>
            <button className="feature-cta" onClick={() => navigate("/recommend")}>
              Try now →
            </button>
          </div>
          <div className="feature-item">
            <div className="feature-num">02</div>
            <div className="feature-title">Donate surplus</div>
            <p className="feature-desc">
              List food you can't use. Connect with people in your community
              who can. Zero waste, maximum impact.
            </p>
            <button className="feature-cta" onClick={() => navigate("/donationform")}>
              Donate →
            </button>
          </div>
          <div className="feature-item">
            <div className="feature-num">03</div>
            <div className="feature-title">Track impact</div>
            <p className="feature-desc">
              See exactly how many meals your donations have enabled.
              Every item counts toward real change.
            </p>
            <button className="feature-cta" onClick={() => navigate("/profile")}>
              Your profile →
            </button>
          </div>
        </div>
      </div>

      <div ref={secondScrollRef}>
        <SecondScroll />
      </div>
    </>
  );
}

export default FirstScroll;