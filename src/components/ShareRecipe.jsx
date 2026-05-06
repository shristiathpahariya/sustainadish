import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../UserContext";
import { apiClient, mlApiUrl } from "../config";
import { useMessageDialog } from "../context/MessageDialogContext";
import { UtensilsCrossed, Plus, X, BookOpen, ChefHat, Sparkles } from "lucide-react";
import "../ShareRecipe.css";

const MAX_TITLE_LENGTH = 500;
const MAX_INSTRUCTIONS_LENGTH = 200000;

const ShareRecipe = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useUser();
  const { notifySuccess, notifyError } = useMessageDialog();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    ingredients: [""],
    instructions: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Autocomplete state per ingredient row
  // activeSuggestions[index] = { suggestions: string[], show: boolean }
  const [activeSuggestions, setActiveSuggestions] = useState({});
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const autocompleteTimers = useRef({});
  const autocompleteContainerRef = useRef(null);
  const ingredientRefs = useRef({});
  const ingredientRef = useRef(null);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated || !user) {
      notifyError("Please log in to share your recipes with the community.", "Authentication Required");
      navigate("/login", { 
        state: { from: location.pathname, message: "Login to share recipes" }
      });
    }
  }, [isAuthenticated, user, navigate, location, notifyError]);

  // Focus on first ingredient on mount
  useEffect(() => {
    if (ingredientRef.current && !submitted) {
      ingredientRef.current.focus();
    }
  }, []);

  const validateForm = () => {
    const newErrors = {};

    // Validate title
    if (!formData.title.trim()) {
      newErrors.title = "Recipe title is required";
    } else if (formData.title.trim().length > MAX_TITLE_LENGTH) {
      newErrors.title = `Title must be ${MAX_TITLE_LENGTH} characters or less`;
    }

    // Validate ingredients
    const validIngredients = formData.ingredients.filter(
      (ing) => ing.trim().length > 0
    );
    if (validIngredients.length < 2) {
      newErrors.ingredients = "Please add at least 2 ingredients";
    } else if (validIngredients.length > 100) {
      newErrors.ingredients = "Maximum 100 ingredients allowed";
    }

    // Validate instructions
    if (!formData.instructions.trim()) {
      newErrors.instructions = "Recipe instructions are required";
    } else if (formData.instructions.length > MAX_INSTRUCTIONS_LENGTH) {
      newErrors.instructions = `Instructions must be ${MAX_INSTRUCTIONS_LENGTH.toLocaleString()} characters or less`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTitleChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_TITLE_LENGTH) {
      setFormData((prev) => ({ ...prev, title: value }));
      if (errors.title && value.trim()) {
        setErrors((prev) => ({ ...prev, title: undefined }));
      }
    }
  };

  const handleIngredientChange = (index, value) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = value;
    setFormData((prev) => ({ ...prev, ingredients: newIngredients }));
    
    if (errors.ingredients) {
      const validIngredients = newIngredients.filter((ing) => ing.trim().length > 0);
      if (validIngredients.length >= 2 && validIngredients.length <= 100) {
        setErrors((prev) => ({ ...prev, ingredients: undefined }));
      }
    }
  };

  const addIngredient = () => {
    if (formData.ingredients.length >= 100) {
      notifyError("Maximum 100 ingredients allowed", "Limit Reached");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, ""],
    }));
  };

  const removeIngredient = (index) => {
    if (formData.ingredients.length <= 1) {
      return;
    }
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, ingredients: newIngredients }));
    // Clean up autocomplete state for removed row
    setActiveSuggestions((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  // ── Autocomplete ──────────────────────────────────────────

  const fetchSuggestions = useCallback(async (index, query) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setActiveSuggestions((prev) => ({
        ...prev,
        [index]: { suggestions: [], show: false },
      }));
      return;
    }

    setAutocompleteLoading(true);
    try {
      const res = await fetch(
        `${mlApiUrl}/ingredients/suggest?q=${encodeURIComponent(trimmed)}&limit=8`
      );
      if (!res.ok) throw new Error('Suggest request failed');
      const data = await res.json();
      const s = Array.isArray(data.suggestions) ? data.suggestions : [];

      setActiveSuggestions((prev) => ({
        ...prev,
        [index]: { suggestions: s, show: s.length > 0 },
      }));
    } catch {
      // Silent fail
      setActiveSuggestions((prev) => ({
        ...prev,
        [index]: { suggestions: [], show: false },
      }));
    } finally {
      setAutocompleteLoading(false);
    }
  }, [mlApiUrl]);

  const debouncedFetchSuggestions = (index, value) => {
    // Clear existing timer for this row
    if (autocompleteTimers.current[index]) {
      clearTimeout(autocompleteTimers.current[index]);
    }
    autocompleteTimers.current[index] = setTimeout(() => {
      fetchSuggestions(index, value);
    }, 250);
  };

  const handleAutocompleteSelect = (index, suggestion) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = suggestion;
    setFormData((prev) => ({ ...prev, ingredients: newIngredients }));

    // Hide suggestions for this row
    setActiveSuggestions((prev) => ({
      ...prev,
      [index]: { suggestions: [], show: false },
    }));

    // Focus back on the ingredient input
    const input = ingredientRefs.current[index];
    if (input) input.focus();
  };

  const handleAutocompleteBlur = (index) => {
    // Delay hiding so click can register
    setTimeout(() => {
      setActiveSuggestions((prev) => {
        const row = prev[index];
        if (!row) return prev;
        return { ...prev, [index]: { ...row, show: false } };
      });
    }, 200);
  };

  // Click outside to close any open autocomplete
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        autocompleteContainerRef.current &&
        !autocompleteContainerRef.current.contains(e.target)
      ) {
        setActiveSuggestions((prev) => {
          const next = {};
          Object.keys(prev).forEach((key) => {
            if (prev[key].show) {
              next[key] = { ...prev[key], show: false };
            } else {
              next[key] = prev[key];
            }
          });
          return next;
        });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleIngredientKeyDown = (e, index) => {
    // Hide autocomplete on Escape
    if (e.key === 'Escape') {
      setActiveSuggestions((prev) => {
        const row = prev[index];
        if (!row) return prev;
        return { ...prev, [index]: { ...row, show: false } };
      });
    }
  };

  const handleInstructionsChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_INSTRUCTIONS_LENGTH) {
      setFormData((prev) => ({ ...prev, instructions: value }));
      if (errors.instructions && value.trim()) {
        setErrors((prev) => ({ ...prev, instructions: undefined }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      notifyError("Please fix the errors before submitting", "Validation Failed");
      return;
    }

    // Filter out empty ingredients
    const validIngredients = formData.ingredients.filter(
      (ing) => ing.trim().length > 0
    );

    setLoading(true);

    try {
      const response = await apiClient.post("/recipes/share", {
        title: formData.title.trim(),
        ingredients: validIngredients,
        instructions: formData.instructions.trim(),
      });

      if (response.data.submitted) {
        setSubmitted(true);
        notifySuccess(
          response.data.updated 
            ? "Your recipe has been updated and submitted for review!"
            : "Your recipe has been submitted for review! It will be available to the community once approved.",
          "Recipe Submitted Successfully"
        );

        // Clear form
        setFormData({
          title: "",
          ingredients: [""],
          instructions: "",
        });

        // Offer to view user's contributions
        setTimeout(() => {
          navigate("/profile?tab=contributions");
        }, 2000);
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to submit recipe. Please try again.";

      notifyError(errorMessage, "Submission Failed");

      // Handle specific error codes
      if (error.response?.status === 409) {
        notifyError(
          "A recipe with these ingredients already exists or is pending review. Try modifying some ingredients.",
          "Duplicate Recipe"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setSubmitted(false);
    setFormData({
      title: "",
      ingredients: [""],
      instructions: "",
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="share-recipe share-recipe--loading">
        <div className="share-recipe__loader">
          <UtensilsCrossed size={48} />
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="share-recipe share-recipe--success">
        <div className="share-recipe__success-content">
          <div className="share-recipe__success-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 className="share-recipe__success-title">Recipe Submitted!</h1>
          <div className="share-recipe__success-message">
            <p><strong>What happens next?</strong></p>
            <ul>
              <li>📋 Your recipe is under review by our community team</li>
              <li>✅ Once approved, it will be available to all users</li>
              <li>🤖 It will be used to improve our recommendation engine</li>
              <li>👍 If approved, you'll get credit as the recipe author</li>
              <li>📊 You can track all your contributions in your profile</li>
            </ul>
          </div>
          <div className="share-recipe__success-actions">
            <button 
              className="share-recipe__btn share-recipe__btn--secondary"
              onClick={handleStartOver}
            >
              Share Another Recipe
            </button>
            <button 
              className="share-recipe__btn share-recipe__btn--primary"
              onClick={() => navigate("/profile?tab=contributions")}
            >
              View My Contributions
            </button>
          </div>
        </div>
      </div>
    );
  }

  const validIngredients = formData.ingredients.filter((ing) => ing.trim().length > 0);

  return (
    <div className="share-recipe">
      <div className="share-recipe__container">
        <header className="share-recipe__header">
          <div className="share-recipe__icon">
            <ChefHat size={32} />
          </div>
          <div>
            <h1 className="share-recipe__title">Share Your Recipe</h1>
            <p className="share-recipe__subtitle">
              Contribute your recipe to help others discover new ideas!
            </p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="share-recipe__form">
          {/* Title Field */}
          <div className="form-group">
            <label htmlFor="title" className="share-recipe__label">
              Recipe Title <span className="required">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              className={`share-recipe__input ${errors.title ? 'share-recipe__input--error' : ''}`}
              placeholder="e.g., Grandma's Summer Tomato Soup"
              value={formData.title}
              onChange={handleTitleChange}
              required
              maxLength={MAX_TITLE_LENGTH}
            />
            <div className="share-recipe__char-count">
              {formData.title.length} / {MAX_TITLE_LENGTH}
            </div>
            {errors.title && (
              <p className="share-recipe__error">{errors.title}</p>
            )}
          </div>

          {/* Ingredients Field */}
          <div className="form-group">
            <label className="share-recipe__label">
              Ingredients <span className="required">*</span>
              <span className="share-recipe__hint">
                (Add ingredients one per line - at least 2)
              </span>
            </label>
            <div className="share-recipe__ingredients-list" ref={autocompleteContainerRef}>
              {formData.ingredients.map((ingredient, index) => {
                const rowSuggest = activeSuggestions[index];
                const hasSuggestions = rowSuggest?.show && rowSuggest?.suggestions?.length > 0;

                return (
                  <div key={index} className="share-recipe__ingredient-row">
                    <div className="share-recipe__ingredient-input-wrap">
                      <input
                        ref={(el) => {
                          ingredientRefs.current[index] = el;
                          if (index === 0) ingredientRef.current = el;
                        }}
                        type="text"
                        className={`share-recipe__input share-recipe__input--ingredient ${
                          errors.ingredients ? 'share-recipe__input--error' : ''
                        }`}
                        placeholder="e.g., 1 cup diced tomatoes"
                        value={ingredient}
                        onChange={(e) => {
                          handleIngredientChange(index, e.target.value);
                          debouncedFetchSuggestions(index, e.target.value);
                        }}
                        onFocus={(e) => {
                          const trimmed = e.target.value.trim();
                          if (trimmed.length >= 2) {
                            debouncedFetchSuggestions(index, trimmed);
                          }
                        }}
                        onBlur={() => handleAutocompleteBlur(index)}
                        onKeyDown={(e) => handleIngredientKeyDown(e, index)}
                        autoComplete="off"
                      />
                      {hasSuggestions && (
                        <div className="share-recipe__autocomplete">
                          {rowSuggest.suggestions.map((suggestion, si) => (
                            <button
                              key={si}
                              type="button"
                              className="share-recipe__autocomplete-item"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleAutocompleteSelect(index, suggestion);
                              }}
                            >
                              <Sparkles size={12} />
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="share-recipe__ingredient-actions">
                      {formData.ingredients.length > 1 && (
                        <button
                          type="button"
                          className="share-recipe__btn-icon share-recipe__btn-icon--remove"
                          onClick={() => removeIngredient(index)}
                          aria-label="Remove ingredient"
                          disabled={loading}
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="share-recipe__ingredient-footer">
              <span className="share-recipe__ingredient-count">
                {validIngredients.length} ingredient{validIngredients.length !== 1 ? 's' : ''} added
              </span>
              <button
                type="button"
                className="share-recipe__btn share-recipe__btn--add"
                onClick={addIngredient}
                disabled={loading || validIngredients.length >= 100}
              >
                <Plus size={16} />
                Add Ingredient
              </button>
            </div>
            {errors.ingredients && (
              <p className="share-recipe__error">{errors.ingredients}</p>
            )}
          </div>

          {/* Instructions Field */}
          <div className="form-group">
            <label htmlFor="instructions" className="share-recipe__label">
              Instructions <span className="required">*</span>
              <span className="share-recipe__hint">
                (Step by step cooking instructions)
              </span>
            </label>
            <textarea
              id="instructions"
              name="instructions"
              className={`share-recipe__textarea ${errors.instructions ? 'share-recipe__textarea--error' : ''}`}
              placeholder="1. Preheat oven to 375°F&#10;2. Mix all ingredients...&#10;3. Bake for 30 minutes..."
              value={formData.instructions}
              onChange={handleInstructionsChange}
              required
              rows={12}
              maxLength={MAX_INSTRUCTIONS_LENGTH}
            />
            <div className="share-recipe__char-count">
              {formData.instructions.length.toLocaleString()} / {MAX_INSTRUCTIONS_LENGTH.toLocaleString()}
            </div>
            {errors.instructions && (
              <p className="share-recipe__error">{errors.instructions}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="share-recipe__actions">
            <button
              type="submit"
              className="share-recipe__btn share-recipe__btn--submit"
              disabled={loading}
            >
              {loading ? (
                <span className="share-recipe__btn-content">
                  <span className="share-recipe__spinner" />
                  Submitting...
                </span>
              ) : (
                <span className="share-recipe__btn-content">
                  <BookOpen size={18} />
                  Submit Recipe for Review
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Info Sidebar */}
        <div className="share-recipe__info">
          <h3 className="share-recipe__info-title">
            <ChefHat size={20} />
            Recipe Guidelines
          </h3>
          <div className="share-recipe__info-content">
            <div className="share-recipe__info-item">
              <h4>Ingredients</h4>
              <ul>
                <li>List ingredients with quantities (e.g., "2 cups flour")</li>
                <li>Add them one per line</li>
                <li>Minimum 2 ingredients, maximum 100</li>
                <li>Be specific for better matching</li>
              </ul>
            </div>
            
            <div className="share-recipe__info-item">
              <h4>Instructions</h4>
              <ul>
                <li>Write clear, step-by-step instructions</li>
                <li>Use numbered steps for clarity</li>
                <li>Include cooking temperatures and times</li>
                <li>Mention any special techniques</li>
              </ul>
            </div>

            <div className="share-recipe__info-item">
              <h4>After Submission</h4>
              <ul>
                <li>📋 Your recipe goes through community review</li>
                <li>✅ Approved recipes are visible to everyone</li>
                <li>🤖 Help improve recommendations for all users</li>
                <li>📊 Track your contributions in your profile</li>
                <li>👍 Get recognition for quality recipes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareRecipe;