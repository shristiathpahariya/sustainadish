import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../config";
import { useUser } from "../UserContext";
import { useMessageDialog } from "../context/MessageDialogContext";
import { splitIngredients, splitInstructions } from "../utils/recipeText";
import { Heart, BookOpen, ChefHat, Clock, Filter, ChevronDown, Search, X } from "lucide-react";
import "../CommunityRecipes.css";

const PAGE_SIZE = 12;

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return d.toLocaleDateString();
}

function getAuthorName(author) {
  if (!author) return "Community";
  if (typeof author === "object") {
    return [author.firstName, author.lastName].filter(Boolean).join(" ") || "Community";
  }
  return "Community";
}

function getIngredientPreview(ingredients, max = 3) {
  const list = splitIngredients(ingredients);
  return list.slice(0, max);
}

function getIngredientCount(ingredients) {
  return splitIngredients(ingredients).length;
}

const SORT_OPTIONS = [
  { value: "updatedAt", label: "Most Recent" },
  { value: "likes", label: "Most Liked" },
  { value: "createdAt", label: "Newest First" },
  { value: "title", label: "A–Z" },
];

const CommunityRecipes = () => {
  const { user } = useUser();
  const { notifySuccess, notifyError } = useMessageDialog();
  const [searchParams, setSearchParams] = useSearchParams();

  // Pagination state
  const [recipes, setRecipes] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter state (client-side)
  const [titleQuery, setTitleQuery] = useState("");

  // Sort state
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "updatedAt");
  const [sortOrder, setSortOrder] = useState(searchParams.get("order") || "desc");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef(null);

  // Modal state
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const dialogRef = useRef(null);

  // Likes tracking — persists across page refreshes
  const [likedSet, setLikedSet] = useState(() => new Set());

  // Fetch user's liked recipe IDs on mount (persists across refreshes)
  useEffect(() => {
    if (!user) {
      setLikedSet(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get("/recipes/liked-ids");
        if (!cancelled && Array.isArray(res.data?.likedIds)) {
          setLikedSet(new Set(res.data.likedIds));
        }
      } catch {
        // Silent fail — likes will work, just won't show as liked initially
      }
    })();
    return () => { cancelled = true; };
  }, [user?._id]);

  // Loading refs
  const loadingRef = useRef(false);

  // Fetch recipes
  const fetchRecipes = useCallback(async (pageNum, sortField, order) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      setLoading(true);
      setError("");

      const res = await apiClient.get("/recipes/community", {
        params: {
          page: pageNum,
          limit: PAGE_SIZE,
          sortBy: sortField,
          order,
        },
      });

      const data = res.data;

      if (pageNum === 1) {
        setRecipes(data.recipes || []);
      } else {
        setRecipes((prev) => [...prev, ...(data.recipes || [])]);
      }

      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setPage(pageNum);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to load community recipes";
      setError(msg);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchRecipes(1, sortBy, sortOrder);
  }, [fetchRecipes, sortBy, sortOrder]);

  // Load more
  const handleLoadMore = () => {
    if (loading || page >= totalPages) return;
    fetchRecipes(page + 1, sortBy, sortOrder);
  };

  // Sort change
  const handleSortChange = (value, order) => {
    const newOrder = order || (value === "title" ? "asc" : "desc");
    setSortBy(value);
    setSortOrder(newOrder);
    setShowSortDropdown(false);
    setSearchParams({ sort: value, order: newOrder });
    fetchRecipes(1, value, newOrder);
  };

  // Close sort dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Modal
  useEffect(() => {
    if (selectedRecipe && dialogRef.current) {
      dialogRef.current.showModal();
    }
  }, [selectedRecipe]);

  const openRecipeDetail = (recipe) => {
    setSelectedRecipe(recipe);
  };

  const closeModal = () => {
    dialogRef.current?.close();
    setSelectedRecipe(null);
  };

  const handleDialogClose = () => {
    setSelectedRecipe(null);
  };

  // Like handler
  const handleLike = async (e, recipe) => {
    e.stopPropagation();
    if (!user) {
      notifyError("Sign in to like recipes", "Sign in required");
      return;
    }

    const prevLiked = likedSet.has(recipe._id);

    // Optimistic update
    setLikedSet((prev) => {
      const next = new Set(prev);
      if (prevLiked) next.delete(recipe._id);
      else next.add(recipe._id);
      return next;
    });

    setRecipes((prev) =>
      prev.map((r) => {
        if (r._id === recipe._id) {
          return { ...r, likes: r.likes + (prevLiked ? -1 : 1) };
        }
        return r;
      })
    );

    try {
      await apiClient.post(`/recipes/${recipe._id}/like`);
    } catch (err) {
      // Revert on error
      setLikedSet((prev) => {
        const next = new Set(prev);
        if (prevLiked) next.add(recipe._id);
        else next.delete(recipe._id);
        return next;
      });
      setRecipes((prev) =>
        prev.map((r) => {
          if (r._id === recipe._id) {
            return { ...r, likes: r.likes + (prevLiked ? 1 : -1) };
          }
          return r;
        })
      );
    }
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label || "Sort";

  const filteredRecipes = useMemo(() => {
    const q = titleQuery.trim().toLowerCase();
    return recipes.filter((r) => {
      const title = (r?.title ?? "").toString().toLowerCase();
      const titleOk = !q || title.includes(q);
      return titleOk;
    });
  }, [recipes, titleQuery]);

  const modalIngredientList = selectedRecipe
    ? splitIngredients(selectedRecipe.ingredients ?? "")
    : [];

  const modalStepList = selectedRecipe
    ? splitInstructions(selectedRecipe.instructions ?? "")
    : [];

  return (
    <section className="community-recipes" aria-label="Community Recipes">
      <div className="community-recipes__inner">
        {/* Header */}
        <header className="community-recipes__header">
          <div className="community-recipes__header-icon">
            <BookOpen size={32} />
          </div>
          <div>
            <h1 className="community-recipes__title">Community Recipes</h1>
            <p className="community-recipes__subtitle">
              Discover recipes shared by fellow food lovers
            </p>
          </div>
          <Link to="/share-recipe" className="community-recipes__share-btn">
            <ChefHat size={16} />
            Share Yours
          </Link>
        </header>

        {/* Sort bar */}
        <div className="community-recipes__toolbar">
          <p className="community-recipes__count">
            {total > 0 ? (
              <>
                {titleQuery.trim() ? (
                  <>
                    {filteredRecipes.length} of {total} recipe{total !== 1 ? "s" : ""} (filtered)
                  </>
                ) : (
                  <>
                    {total} recipe{total !== 1 ? "s" : ""} shared
                  </>
                )}
              </>
            ) : (
              "Loading recipes..."
            )}
          </p>

          <div className="community-recipes__filters" role="search">
            <div className="community-recipes__search">
              <Search size={16} />
              <input
                type="search"
                className="community-recipes__search-input"
                placeholder="Search by title…"
                value={titleQuery}
                onChange={(e) => setTitleQuery(e.target.value)}
                aria-label="Search recipes by title"
              />
              {titleQuery.trim() && (
                <button
                  type="button"
                  className="community-recipes__search-clear"
                  onClick={() => setTitleQuery("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

          </div>

          <div className="community-recipes__sort" ref={sortDropdownRef}>
            <button
              type="button"
              className="community-recipes__sort-btn"
              onClick={() => setShowSortDropdown((o) => !o)}
            >
              <Filter size={14} />
              <span>{currentSortLabel}</span>
              <ChevronDown size={14} className={showSortDropdown ? "community-recipes__sort-chevron--open" : ""} />
            </button>
            {showSortDropdown && (
              <div className="community-recipes__sort-dropdown">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`community-recipes__sort-option ${
                      sortBy === opt.value ? "community-recipes__sort-option--active" : ""
                    }`}
                    onClick={() => handleSortChange(opt.value)}
                  >
                    {opt.label}
                    {sortBy === opt.value && <span className="community-recipes__sort-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="community-recipes__error">
            <p>{error}</p>
            <button
              type="button"
              className="community-recipes__retry-btn"
              onClick={() => fetchRecipes(1, sortBy, sortOrder)}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Grid */}
        {!error && (
          <>
            {filteredRecipes.length > 0 ? (
              <div className="community-recipes__grid">
                {filteredRecipes.map((recipe) => {
                  const previewIngredients = getIngredientPreview(recipe.ingredients, 3);
                  const ingredientCount = getIngredientCount(recipe.ingredients);
                  const isLiked = likedSet.has(recipe._id);

                  return (
                    <article
                      key={recipe._id}
                      className="community-recipes__card"
                      onClick={() => openRecipeDetail(recipe)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") openRecipeDetail(recipe);
                      }}
                    >
                      <div className="community-recipes__card-header">
                        <h2 className="community-recipes__card-title">{recipe.title}</h2>
                      </div>

                      <div className="community-recipes__card-meta">
                        <span className="community-recipes__card-author">
                          <ChefHat size={12} />
                          {getAuthorName(recipe.author)}
                        </span>
                        <span className="community-recipes__card-date">
                          <Clock size={12} />
                          {formatDate(recipe.updatedAt)}
                        </span>
                      </div>

                      <div className="community-recipes__card-ingredients">
                        {previewIngredients.map((ing, i) => (
                          <span key={i} className="community-recipes__card-ingredient">
                            {ing}
                          </span>
                        ))}
                        {ingredientCount > 3 && (
                          <span className="community-recipes__card-more">
                            +{ingredientCount - 3} more
                          </span>
                        )}
                      </div>

                      <div className="community-recipes__card-footer">
                        <button
                          type="button"
                          className={`community-recipes__like-btn ${
                            isLiked ? "community-recipes__like-btn--active" : ""
                          }`}
                          onClick={(e) => handleLike(e, recipe)}
                          aria-label={isLiked ? "Unlike" : "Like"}
                        >
                          <Heart
                            size={16}
                            fill={isLiked ? "currentColor" : "none"}
                          />
                          <span>{recipe.likes || 0}</span>
                        </button>
                        <span className="community-recipes__card-view">View recipe →</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : loading ? null : (
              <div className="community-recipes__empty">
                <BookOpen size={48} />
                {recipes.length === 0 ? (
                  <>
                    <h2>No recipes yet</h2>
                    <p>Be the first to share a recipe with the community!</p>
                    <Link to="/share-recipe" className="community-recipes__empty-btn">
                      Share a Recipe
                    </Link>
                  </>
                ) : (
                  <>
                    <h2>No matches found</h2>
                    <p>Try a different title.</p>
                    <button
                      type="button"
                      className="community-recipes__empty-btn"
                      onClick={() => {
                        setTitleQuery("");
                      }}
                    >
                      Clear Filters
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Loading indicator */}
            {loading && (
              <div className="community-recipes__loading" role="status" aria-live="polite">
                <span className="community-recipes__spinner" aria-hidden />
                <span>Loading recipes...</span>
              </div>
            )}

            {/* Load more */}
            {!loading && page < totalPages && (
              <div className="community-recipes__load-more">
                <button
                  type="button"
                  className="community-recipes__load-btn"
                  onClick={handleLoadMore}
                >
                  Load More Recipes
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Recipe Detail Modal */}
      <dialog
        ref={dialogRef}
        className="community-recipes__modal"
        aria-labelledby="community-recipe-modal-title"
        onClose={handleDialogClose}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        {selectedRecipe && (
          <div className="community-recipes__modal-panel" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="community-recipes__modal-close"
              onClick={closeModal}
              aria-label="Close"
            >
              ×
            </button>

            <h2 id="community-recipe-modal-title" className="community-recipes__modal-title">
              {selectedRecipe.title}
            </h2>

            <div className="community-recipes__modal-meta">
              <span>
                <ChefHat size={14} />
                By {getAuthorName(selectedRecipe.author)}
              </span>
              <span>
                <Heart size={14} /> {selectedRecipe.likes || 0} likes
              </span>
              <span>
                <Clock size={14} />
                Shared {formatDate(selectedRecipe.createdAt)}
              </span>
            </div>

            <h3 className="community-recipes__modal-subtitle">Ingredients</h3>
            {modalIngredientList.length > 0 ? (
              <ul className="community-recipes__modal-list">
                {modalIngredientList.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="community-recipes__modal-empty">No ingredient list included.</p>
            )}

            <h3 className="community-recipes__modal-subtitle">Instructions</h3>
            {modalStepList.length > 0 ? (
              <ol className="community-recipes__modal-steps">
                {modalStepList.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            ) : (
              <p className="community-recipes__modal-empty">No instructions included.</p>
            )}

            <div className="community-recipes__modal-footer">
              <button
                type="button"
                className={`community-recipes__like-btn community-recipes__like-btn--lg ${
                  likedSet.has(selectedRecipe._id) ? "community-recipes__like-btn--active" : ""
                }`}
                onClick={(e) => handleLike(e, selectedRecipe)}
              >
                <Heart
                  size={18}
                  fill={likedSet.has(selectedRecipe._id) ? "currentColor" : "none"}
                />
                <span>
                  {likedSet.has(selectedRecipe._id) ? "Liked" : "Like"} ({selectedRecipe.likes || 0})
                </span>
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
};

export default CommunityRecipes;