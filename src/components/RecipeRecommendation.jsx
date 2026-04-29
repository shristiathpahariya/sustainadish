import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { mlApiUrl, apiClient } from "../config";
import { useUser } from "../UserContext";
import { useMessageDialog } from "../context/MessageDialogContext";
import { buildRecipeKey } from "../utils/recipeKey";
import { splitIngredients, splitInstructions } from "../utils/recipeText";
import "../recipe.css";

/** Stub for future analytics (e.g. POST /api/events). Call when user opens full recipe detail. */
function logRecipeOpen(payload) {
  if (import.meta.env?.DEV) {
    console.debug("[recipe analytics]", payload);
  }
}

const RecipeRecommendation = () => {
  const { user } = useUser();
  const { notifySuccess, notifyError } = useMessageDialog();
  const [ingredients, setIngredients] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState("");
  const [resultsLoaded, setResultsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const dialogRef = useRef(null);
  const [savedKeySet, setSavedKeySet] = useState(() => new Set());
  const [recipeHashes, setRecipeHashes] = useState([]);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [saveError, setSaveError] = useState("");

  const selectedRecipe =
    selectedIndex !== null && selectedIndex < recipes.length ? recipes[selectedIndex] : null;

  const modalTitle = selectedRecipe
    ? (selectedRecipe.Title ?? selectedRecipe.title ?? "Recipe")
    : "";
  const modalIngredientList = selectedRecipe
    ? splitIngredients(selectedRecipe.Ingredients ?? selectedRecipe.ingredients ?? "")
    : [];
  const modalStepList = selectedRecipe
    ? splitInstructions(selectedRecipe.Instructions ?? selectedRecipe.instructions ?? "")
    : [];

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
    setSaveError("");
  };

  useEffect(() => {
    if (!user) {
      setSavedKeySet(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get("/saved-recipe-keys");
        const keys = Array.isArray(data?.recipeKeys) ? data.recipeKeys : [];
        if (!cancelled) setSavedKeySet(new Set(keys));
      } catch {
        if (!cancelled) setSavedKeySet(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!recipes.length) {
      setRecipeHashes([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const hashes = await Promise.all(
        recipes.map((r) =>
          buildRecipeKey(r.Title ?? r.title ?? "", r.Ingredients ?? r.ingredients ?? "")
        )
      );
      if (!cancelled) setRecipeHashes(hashes);
    })();
    return () => {
      cancelled = true;
    };
  }, [recipes]);

  const openRecipeDetail = (index) => {
    const recipe = recipes[index];
    if (!recipe) return;
    const title = recipe.Title ?? recipe.title ?? "Recipe";
    logRecipeOpen({
      event: "recipe_open",
      title,
      rank: index,
      totalShown: recipes.length,
      searchQuery: ingredients.trim(),
    });
    setSelectedIndex(index);
    setSaveError("");
  };

  const handleSaveRecipe = async () => {
    if (!selectedRecipe || !user) return;
    setSavingRecipe(true);
    setSaveError("");
    try {
      const { data } = await apiClient.post("/saved-recipes", {
        title: modalTitle,
        ingredients: selectedRecipe.Ingredients ?? selectedRecipe.ingredients,
        instructions: selectedRecipe.Instructions ?? selectedRecipe.instructions ?? "",
      });
      const key = data?.recipe?.recipeKey;
      if (key) {
        setSavedKeySet((prev) => new Set([...prev, key]));
      }
      notifySuccess(
        data?.alreadySaved ? "Already in your profile." : "Saved to your profile.",
        "Recipes"
      );
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Could not save this recipe.";
      setSaveError(typeof msg === "string" ? msg : "Could not save.");
      notifyError(typeof msg === "string" ? msg : "Could not save this recipe.");
    } finally {
      setSavingRecipe(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSelectedIndex(null);
    dialogRef.current?.close();
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
            const ingredientList = Array.isArray(ing) ? ing : splitIngredients(ing);
            const previewItems = ingredientList.slice(0, 2);
            const extraCount = Math.max(0, ingredientList.length - previewItems.length);

            // Coverage score from backend (0-100)
            const coverageScore = typeof recipe.coverage_score === "number"
              ? recipe.coverage_score
              : null;

            // Visual label based on coverage
            const coverageLabel = coverageScore !== null
              ? `Uses ${Math.round(coverageScore)}% of your ingredients`
              : "";

            const coverageClass = coverageScore !== null
              ? (coverageScore >= 80 ? "high" : coverageScore >= 50 ? "medium" : "low")
              : null;

            return (
              <article key={`${title}-${index}`} className="recipe-card recipe-card--preview">
                <p className="recipe-card__index">
                  Recipe {index + 1}
                  {recipes.length > 1 ? ` of ${recipes.length}` : ""}
                </p>
                <h2 className="recipe-card__title">
                  {title}
                  {recipeHashes[index] && savedKeySet.has(recipeHashes[index]) ? (
                    <span className="recipe-card__saved-badge">Saved</span>
                  ) : null}
                </h2>
                {coverageLabel && coverageClass ? (
                  <p className={`recipe-card__coverage recipe-card__coverage--${coverageClass}`}>
                    {coverageLabel}
                  </p>
                ) : null}
                {ingredientList.length > 0 ? (
                  <p className="recipe-card__preview-line">
                    {previewItems.join(" · ")}
                    {extraCount > 0 ? ` · +${extraCount} more` : ""}
                  </p>
                ) : (
                  <p className="recipe-card__preview-line recipe-card__preview-line--muted">
                    Ingredient list not available — open to view details.
                  </p>
                )}
                <button
                  type="button"
                  className="recipe-card__open"
                  onClick={() => openRecipeDetail(index)}
                >
                  View full recipe
                </button>
              </article>
            );
          })}
        </div>

        <dialog
          ref={dialogRef}
          className="recipe-modal"
          aria-labelledby="recipe-modal-title"
          onClose={handleDialogClose}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          {selectedRecipe ? (
            <div
              className="recipe-modal__panel"
              onClick={(e) => e.stopPropagation()}
              role="document"
            >
              <button
                type="button"
                className="recipe-modal__close"
                onClick={closeModal}
                aria-label="Close recipe"
              >
                ×
              </button>
              <p className="recipe-card__index">
                {selectedIndex !== null && recipes.length > 1
                  ? `Recipe ${selectedIndex + 1} of ${recipes.length}`
                  : "Recipe"}
              </p>
              <h2 id="recipe-modal-title" className="recipe-card__title recipe-modal__title">
                {modalTitle}
              </h2>
              <h3 className="recipe-card__subtitle">Ingredients</h3>
              {modalIngredientList.length > 0 ? (
                <ul className="recipe-card__list">
                  {modalIngredientList.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="recipe-card__empty-part">
                  No ingredient list included for this recipe.
                </p>
              )}
              <h3 className="recipe-card__subtitle">Instructions</h3>
              {modalStepList.length > 0 ? (
                <ol className="recipe-card__steps">
                  {modalStepList.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              ) : (
                <p className="recipe-card__empty-part">No instructions included.</p>
              )}
              <div className="recipe-modal__footer">
                {user ? (
                  <>
                    <button
                      type="button"
                      className="recipe-modal__btn-save"
                      onClick={handleSaveRecipe}
                      disabled={
                        savingRecipe ||
                        (recipeHashes[selectedIndex] &&
                          savedKeySet.has(recipeHashes[selectedIndex]))
                      }
                    >
                      {recipeHashes[selectedIndex] && savedKeySet.has(recipeHashes[selectedIndex])
                        ? "Saved to profile"
                        : savingRecipe
                          ? "Saving…"
                          : "Save to profile"}
                    </button>
                    {saveError ? (
                      <p className="recipe-modal__save-error" role="alert">
                        {saveError}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="recipe-modal__login-hint">
                    <Link to="/login">Sign in</Link> to save recipes to your profile.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </dialog>

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
