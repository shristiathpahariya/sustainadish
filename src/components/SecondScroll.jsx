import React from "react";
import { useNavigate } from "react-router-dom";
import "../landing.css";

export default function SecondScroll() {
  const navigate = useNavigate();

  const sampleRecipes = [
    { cat: "Nepalese · 25 min", name: "Dal Bhat", meta: "By Sita Sharma · Vegetarian" },
    { cat: "Street food · 40 min", name: "Steamed Momos", meta: "By Raj K. · Veg & Non-veg" },
    { cat: "Breakfast · 30 min", name: "Sel Roti", meta: "By Meena T. · Sweet" },
  ];

  return (
    <section className="scroll scroll--recipes" aria-label="Recipes">
      <div className="section-inner">
        <div className="section-header">
          <span className="section-title">Fresh from the community</span>
          <span
            className="section-eyebrow"
            onClick={() => navigate("/recommend")}
            role="button"
            tabIndex={0}
          >
            All recipes
          </span>
        </div>

        <div className="content">
          <p>
            Every recipe here was shared by someone in your community — real
            home cooks turning everyday ingredients into something special.
          </p>
          <button
            type="button"
            className="get-started"
            onClick={() => navigate("/recommend")}
          >
            Discover recipes
          </button>
        </div>

        <div className="recipe-grid" style={{ marginTop: "2rem" }}>
          {sampleRecipes.map((r, i) => (
            <div key={i} className="recipe-card">
              <div
                className="recipe-img"
                style={{
                  background: ["#faeeda","#faece7","#eaf3de"][i],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: ["#854f0b","#993c1d","#3b6d11"][i],
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 12,
                }}
              >
                Dish photo
              </div>
              <div className="recipe-cat">{r.cat}</div>
              <div className="recipe-name">{r.name}</div>
              <div className="recipe-meta">{r.meta}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}