import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { mlApiUrl } from "../config";
import "../landing.css";

/** Broad pantry staples — passed to the ML service to surface three diverse matches on the landing page. */
const LANDING_INGREDIENT_QUERY =
  "tomato, onion, garlic, rice, chicken, potato, olive oil, salt";

const FALLBACK_RECIPES = [
  {
    cat: "Nepalese · 25 min",
    name: "Dal Bhat",
    meta: "By Sita Sharma · Vegetarian",
    fromModel: false,
    ingredientsRaw: null,
    instructionsRaw: null,
  },
  {
    cat: "Street food · 40 min",
    name: "Steamed Momos",
    meta: "By Raj K. · Veg & Non-veg",
    fromModel: false,
    ingredientsRaw: null,
    instructionsRaw: null,
  },
  {
    cat: "Breakfast · 30 min",
    name: "Sel Roti",
    meta: "By Meena T. · Sweet",
    fromModel: false,
    ingredientsRaw: null,
    instructionsRaw: null,
  },
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

function splitIngredients(raw) {
  return normalizeIngredients(raw);
}

function splitInstructions(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map(String).map((s) => s.trim()).filter(Boolean);
  }
  const s = String(raw).trim();
  if (!s) return [];
  const bySentence = s
    .replace(/\d+\.\s/g, "")
    .split(/[.!?]\s+/)
    .map((step) => step.trim())
    .filter(Boolean);
  if (bySentence.length > 1) return bySentence;
  const byLine = s.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  if (byLine.length > 1) return byLine;
  return [s];
}

export default function SecondScroll() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usedFallback, setUsedFallback] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const dialogRef = useRef(null);

  const listSource = loading ? [] : recipes.length ? recipes : FALLBACK_RECIPES;

  const selectedRow =
    selectedIndex !== null && selectedIndex < listSource.length
      ? listSource[selectedIndex]
      : null;

  useEffect(() => {
    if (selectedIndex === null) return;
    const el = dialogRef.current;
    if (!el) return;
    if (!el.open) el.showModal();
  }, [selectedIndex]);

  const closeModal = () => {
    dialogRef.current?.close();
    setSelectedIndex(null);
  };

  const handleDialogClose = () => {
    setSelectedIndex(null);
  };

  const openRecipeModal = (index) => {
    setSelectedIndex(index);
  };

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
            ingredientsRaw: ing,
            instructionsRaw: r.Instructions ?? r.instructions ?? "",
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

  const displayList = loading
    ? [0, 1, 2].map((i) => ({ key: `sk-${i}`, skeleton: true }))
    : listSource.map((r, i) => ({ key: `${r.name}-${i}`, ...r }));

  const modalTitle = selectedRow?.name ?? "";
  const modalIngredientList = selectedRow ? splitIngredients(selectedRow.ingredientsRaw) : [];
  const modalStepList = selectedRow ? splitInstructions(selectedRow.instructionsRaw) : [];
  const modalHasFullRecipe =
    selectedRow?.fromModel === true &&
    (modalIngredientList.length > 0 || modalStepList.length > 0);

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

        <div className="recipe-grid recipe-grid--text-only" style={{ marginTop: "2rem" }}>
          {displayList.map((item, i) =>
            item.skeleton ? (
              <div key={item.key} className="recipe-card recipe-card--loading" aria-hidden="true">
                <div className="recipe-cat recipe-cat--skeleton">&nbsp;</div>
                <div className="recipe-name recipe-name--skeleton">&nbsp;</div>
                <div className="recipe-meta recipe-meta--skeleton">&nbsp;</div>
              </div>
            ) : (
              <div
                key={item.key}
                className="recipe-card recipe-card--text-only"
                role="button"
                tabIndex={0}
                onClick={() => openRecipeModal(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openRecipeModal(i);
                  }
                }}
              >
                <div className="recipe-cat">{item.cat}</div>
                <div className="recipe-name">{item.name}</div>
                <div className="recipe-meta">{item.meta}</div>
              </div>
            )
          )}
        </div>

        <dialog
          ref={dialogRef}
          className="landing-recipe-modal"
          aria-labelledby="landing-recipe-modal-title"
          onClose={handleDialogClose}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          {selectedRow ? (
            <div
              className="landing-recipe-modal__panel"
              onClick={(e) => e.stopPropagation()}
              role="document"
            >
              <button
                type="button"
                className="landing-recipe-modal__close"
                onClick={closeModal}
                aria-label="Close recipe"
              >
                ×
              </button>
              <p className="landing-recipe-modal__eyebrow">{selectedRow.cat}</p>
              <h2 id="landing-recipe-modal-title" className="landing-recipe-modal__title">
                {modalTitle}
              </h2>

              {modalHasFullRecipe ? (
                <>
                  <h3 className="landing-recipe-modal__subtitle">Ingredients</h3>
                  {modalIngredientList.length > 0 ? (
                    <ul className="landing-recipe-modal__list">
                      {modalIngredientList.map((line, idx) => (
                        <li key={idx}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="landing-recipe-modal__empty">No ingredient list included.</p>
                  )}
                  <h3 className="landing-recipe-modal__subtitle">Instructions</h3>
                  {modalStepList.length > 0 ? (
                    <ol className="landing-recipe-modal__steps">
                      {modalStepList.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="landing-recipe-modal__empty">No instructions included.</p>
                  )}
                </>
              ) : (
                <div className="landing-recipe-modal__fallback">
                  <p className="landing-recipe-modal__fallback-text">{selectedRow.meta}</p>
                  <p className="landing-recipe-modal__fallback-hint">
                    For full ingredients and steps from the model, open{" "}
                    <button
                      type="button"
                      className="landing-recipe-modal__link"
                      onClick={() => {
                        closeModal();
                        navigate("/recommend");
                      }}
                    >
                      Recipe recommendations
                    </button>
                    .
                  </p>
                </div>
              )}

              <button type="button" className="landing-recipe-modal__cta" onClick={closeModal}>
                Close
              </button>
            </div>
          ) : null}
        </dialog>
      </div>
    </section>
  );
}
