import React, { useState } from "react";
import { Link } from "react-router-dom";
import { mlApiUrl } from "../config";
import "../recipe.css";

const splitIngredients = (raw) => {
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
};

const splitInstructions = (raw) => {
  if (raw == null) return [];
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
};

const RecipeRecommendation = () => {
  const [ingredients, setIngredients] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState("");
  const [resultsLoaded, setResultsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setRecipes([]);
    setResultsLoaded(false);
    setLoading(true);

    try {
      const response = await fetch(`${mlApiUrl}/recommend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ ingredients }),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        setError("Unexpected response from recipe service.");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(data?.message || "Could not get recommendations. Try again.");
        setLoading(false);
        return;
      }

      const list = Array.isArray(data) ? data : [];
      setRecipes(list);
      setResultsLoaded(true);
    } catch {
      setError("Could not reach the recipe service. Check that it is running, or try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="recommend-page" aria-label="Recipe recommendations">
      <div className="recommend-page__inner">
        <header className="recommend-page__header">
          <p className="recommend-page__eyebrow">Leftovers to ideas</p>
          <h1 className="recommend-page__title">Recipe recommendations</h1>
          <p className="recommend-page__lede">
            Enter ingredients you have on hand. We&apos;ll suggest recipes that put them to good
            use.
          </p>
          <Link to="/" className="recommend-page__home">
            Back to home
          </Link>
        </header>

        <div className="recommend-page__separator" aria-hidden="true">
          <div className="recommend-page__sep-line" />
          <div className="recommend-page__sep-diamond" />
          <span className="recommend-page__sep-label">Your ingredients</span>
          <div className="recommend-page__sep-diamond" />
          <div className="recommend-page__sep-line" />
        </div>

        <form className="recommend-form" onSubmit={handleSubmit}>
          <label htmlFor="ingredients" className="recommend-form__label">
            Ingredients <span className="recommend-form__hint">(comma separated)</span>
          </label>
          <input
            type="text"
            id="ingredients"
            name="ingredients"
            className="recommend-form__input"
            placeholder="e.g. tomato, cheese, basil, rice"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            required
            autoComplete="off"
          />
          <button type="submit" className="recommend-form__submit" disabled={loading}>
            {loading ? "Finding recipes…" : "Get recommendations"}
          </button>
        </form>

        {loading ? (
          <div className="recommend-page__loading" role="status" aria-live="polite">
            <span className="recommend-page__spinner" aria-hidden />
            <span>Finding recipes…</span>
          </div>
        ) : null}

        {error ? (
          <p className="recommend-page__error" role="alert">
            {error}
          </p>
        ) : null}

        {resultsLoaded && recipes.length === 0 && !error ? (
          <p className="recommend-page__empty">No recipes matched. Try different ingredients.</p>
        ) : null}

        <div className="recommend-results">
          {recipes.map((recipe, index) => {
            const title = recipe.Title ?? recipe.title ?? "Recipe";
            const ing = recipe.Ingredients ?? recipe.ingredients ?? "";
            const steps = recipe.Instructions ?? recipe.instructions ?? "";
            const ingredientList = splitIngredients(ing);
            const stepList = splitInstructions(steps);
            return (
              <article key={`${title}-${index}`} className="recipe-card">
                <p className="recipe-card__index">
                  Recipe {index + 1}
                  {recipes.length > 1 ? ` of ${recipes.length}` : ""}
                </p>
                <h2 className="recipe-card__title">{title}</h2>
                <h3 className="recipe-card__subtitle">Ingredients</h3>
                {ingredientList.length > 0 ? (
                  <ul className="recipe-card__list">
                    {ingredientList.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="recipe-card__empty-part">No ingredient list included for this recipe.</p>
                )}
                <h3 className="recipe-card__subtitle">Instructions</h3>
                {stepList.length > 0 ? (
                  <ol className="recipe-card__steps">
                    {stepList.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="recipe-card__empty-part">No instructions included.</p>
                )}
              </article>
            );
          })}
        </div>

        {!resultsLoaded && !loading ? (
          <div className="recommend-media">
            <img
              src="/rice.png"
              alt=""
              className="recommend-media__img"
              width={440}
              height={330}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/landing.png";
              }}
            />
            <p className="recommend-media__caption">Cook smarter with what you already have.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default RecipeRecommendation;
