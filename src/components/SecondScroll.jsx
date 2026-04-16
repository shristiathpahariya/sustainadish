import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { mlApiUrl } from "../config";
import "../landing.css";

/** Broad pantry staples — passed to the ML service to surface three diverse matches on the landing page. */
const LANDING_INGREDIENT_QUERY =
  "tomato, onion, garlic, rice, chicken, potato, olive oil, salt";

const FALLBACK_RECIPES = [
  { cat: "Nepalese · 25 min", name: "Dal Bhat", meta: "By Sita Sharma · Vegetarian" },
  { cat: "Street food · 40 min", name: "Steamed Momos", meta: "By Raj K. · Veg & Non-veg" },
  { cat: "Breakfast · 30 min", name: "Sel Roti", meta: "By Meena T. · Sweet" },
];

function normalizeIngredients(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  const s = String(raw).trim();
  if (!s) return [];
  const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  return s
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function ingredientPreviewLine(ingredients) {
  const list = normalizeIngredients(ingredients);
  if (list.length === 0) return "Suggested from the recipe model";
  const head = list.slice(0, 2).join(" · ");
  const extra = list.length > 2 ? ` · +${list.length - 2} more` : "";
  return head + extra;
}

export default function SecondScroll() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setUsedFallback(false);
      try {
        const response = await fetch(`${mlApiUrl}/recommend`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ ingredients: LANDING_INGREDIENT_QUERY }),
          signal: ac.signal,
        });

        let data;
        try {
          data = await response.json();
        } catch {
          setRecipes(FALLBACK_RECIPES);
          setUsedFallback(true);
          return;
        }

        if (!response.ok || !Array.isArray(data)) {
          setRecipes(FALLBACK_RECIPES);
          setUsedFallback(true);
          return;
        }

        const mapped = data.slice(0, 3).map((r) => {
          const title = r.Title ?? r.title ?? "Recipe";
          const ing = r.Ingredients ?? r.ingredients ?? "";
          return {
            cat: "Matched for you · AI",
            name: title,
            meta: ingredientPreviewLine(ing),
            fromModel: true,
          };
        });

        if (mapped.length === 0) {
          setRecipes(FALLBACK_RECIPES);
          setUsedFallback(true);
        } else if (mapped.length < 3) {
          const need = 3 - mapped.length;
          setRecipes([...mapped, ...FALLBACK_RECIPES.slice(0, need)]);
          setUsedFallback(true);
        } else {
          setRecipes(mapped);
          setUsedFallback(false);
        }
      } catch (e) {
        if (e.name === "AbortError") return;
        setRecipes(FALLBACK_RECIPES);
        setUsedFallback(true);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  const listSource = loading ? [] : recipes.length ? recipes : FALLBACK_RECIPES;

  const displayList = loading
    ? [0, 1, 2].map((i) => ({ key: `sk-${i}`, skeleton: true }))
    : listSource.map((r, i) => ({ key: `${r.name}-${i}`, ...r }));

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
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/recommend");
              }
            }}
          >
            All recipes
          </span>
        </div>

        <p className="scroll-recipes__hint" aria-live="polite">
          {loading
            ? "Loading recipe picks…"
            : usedFallback
              ? "Sample recipes fill in when the model returns fewer than three matches or the service is offline. Try Recommendations for a full search."
              : `Suggestions based on: ${LANDING_INGREDIENT_QUERY}`}
        </p>

        <div className="content">
          <p>
            Every recipe here was shared by someone in your community — real home cooks turning
            everyday ingredients into something special.
          </p>
          <button type="button" className="get-started" onClick={() => navigate("/recommend")}>
            Discover recipes
          </button>
        </div>

        <div className="recipe-grid" style={{ marginTop: "2rem" }}>
          {displayList.map((item, i) =>
            item.skeleton ? (
              <div key={item.key} className="recipe-card recipe-card--loading" aria-hidden="true">
                <div
                  className="recipe-img recipe-img--skeleton"
                  style={{
                    background: ["#faeeda", "#faece7", "#eaf3de"][i],
                  }}
                />
                <div className="recipe-cat recipe-cat--skeleton">&nbsp;</div>
                <div className="recipe-name recipe-name--skeleton">&nbsp;</div>
                <div className="recipe-meta recipe-meta--skeleton">&nbsp;</div>
              </div>
            ) : (
              <div
                key={item.key}
                className="recipe-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate("/recommend")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate("/recommend");
                  }
                }}
              >
                <div
                  className="recipe-img"
                  style={{
                    background: ["#faeeda", "#faece7", "#eaf3de"][i],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: ["#854f0b", "#993c1d", "#3b6d11"][i],
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 12,
                  }}
                >
                  {item.fromModel === true ? "Model pick" : "Dish photo"}
                </div>
                <div className="recipe-cat">{item.cat}</div>
                <div className="recipe-name">{item.name}</div>
                <div className="recipe-meta">{item.meta}</div>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
