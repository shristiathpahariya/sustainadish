import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../config";
import { useUser } from "../UserContext";
import { useMessageDialog } from "../context/MessageDialogContext";
import { splitIngredients, splitInstructions } from "../utils/recipeText";
import { Shield, Eye, Check, X, ChevronDown, Search, Filter, Clock, ChefHat, User, AlertCircle, CheckCircle, RotateCcw, Trash2, CheckSquare, Square } from "lucide-react";
import "../AdminRecipeReview.css";

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { value: "pending_review", label: "Pending Review" },
];

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAuthorName(author) {
  if (!author) return "Unknown";
  if (typeof author === "object") {
    return [author.firstName, author.lastName].filter(Boolean).join(" ") || author.email || "Unknown";
  }
  return "Unknown";
}

const AdminRecipeReview = () => {
  const { user, isAuthenticated } = useUser();
  const { notifySuccess, notifyError, notifyConfirm } = useMessageDialog();
  const navigate = useNavigate();

  // State
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending_review");

  // Modal
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const dialogRef = useRef(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Sort dropdown
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef(null);

  // Bulk action state
  const [selectedRecipeIds, setSelectedRecipeIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [bulkRejectDialogOpen, setBulkRejectDialogOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");
  const [bulkActionProgress, setBulkActionProgress] = useState({
    active: false,
    current: 0,
    total: 0,
    action: null,
    errors: [],
    results: []
  });

  // Bulk action dialog refs
  const bulkProgressModalRef = useRef(null);
  const bulkRejectDialogRef = useRef(null);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated || !user) {
      notifyError("Please log in to access the admin panel.", "Authentication Required");
      navigate("/login", {
        state: { from: "/admin/review", message: "Login required for admin access" },
      });
    }
  }, [isAuthenticated, user, navigate, notifyError]);

  // Handle admin privilege check on API error
  const handleAdminAccessDenied = useCallback(() => {
    notifyError("You don't have admin privileges to access this page", "Access Denied");
    // Redirect to home after showing error message
    setTimeout(() => {
      navigate("/", { replace: true });
    }, 2000); // 2 second delay to let user see the error message
  }, [navigate, notifyError]);

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

  // Modal handling
  useEffect(() => {
    if (selectedRecipe && dialogRef.current) {
      dialogRef.current.showModal();
    }
  }, [selectedRecipe]);

  // Bulk reject modal handling
  useEffect(() => {
    if (bulkRejectDialogOpen && bulkRejectDialogRef.current) {
      bulkRejectDialogRef.current.showModal();
    } else if (bulkRejectDialogRef.current) {
      bulkRejectDialogRef.current.close();
    }
  }, [bulkRejectDialogOpen]);

  const openRecipeDetail = (recipe) => {
    setSelectedRecipe(recipe);
  };

  const closeModal = () => {
    dialogRef.current?.close();
    setSelectedRecipe(null);
    setShowRejectDialog(false);
    setRejectReason("");
  };

  const handleDialogClose = () => {
    setSelectedRecipe(null);
    setShowRejectDialog(false);
    setRejectReason("");
  };

  // Fetch recipes
  const fetchRecipes = useCallback(async (pageNum) => {
    try {
      setLoading(true);
      setError("");

      const res = await apiClient.get("/admin/recipes/pending", {
        params: {
          page: pageNum,
          limit: PAGE_SIZE,
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
      const msg = err.response?.data?.message || "Failed to load recipes";
      setError(msg);
      
      // Handle 403 - not admin
      if (err.response?.status === 403) {
        handleAdminAccessDenied();
      }
    } finally {
      setLoading(false);
    }
  }, [notifyError, handleAdminAccessDenied]);

  // Initial load and filter changes
  useEffect(() => {
    fetchRecipes(1);
  }, [fetchRecipes]);

  // Search filtering (client-side)
  const filteredRecipes = recipes.filter((recipe) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const title = (recipe.title || "").toLowerCase();
    const author = getAuthorName(recipe.author).toLowerCase();
    return title.includes(query) || author.includes(query);
  });

  // Approve recipe
  const handleApprove = async (recipe) => {
    const confirmed = await notifyConfirm(
      `Are you sure you want to approve "${recipe.title}"? This will make it visible to all users.`,
      "Approve Recipe",
      { confirmLabel: "Approve" }
    );

    if (!confirmed) return;

setActionLoading(true);
    try {
      const res = await apiClient.post(`/admin/recipes/${recipe._id}/approve`);

      console.log(`Approve response:`, res.data);

      // Check for approved flag OR 200 status as fallback
      const isSuccessful = res.status === 200 && (res.data.approved === true || res.data.success === true);

      if (isSuccessful) {
        // Update local state
        setRecipes((prev) =>
          prev.filter((r) => r._id !== recipe._id)
        );
        setTotal((prev) => Math.max(0, prev - 1));

        notifySuccess("Recipe has been approved and is now visible to users.", "Recipe Approved");

        if (selectedRecipe && selectedRecipe._id === recipe._id) {
          closeModal();
        }
      } else {
        const msg = res.data.message || "Failed to approve recipe";
        notifyError(msg, "Approval Failed");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to approve recipe";
      console.error("Approve error:", err);
      notifyError(msg, "Approval Failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Reject recipe
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      notifyError("Please provide a reason for rejection", "Reason Required");
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiClient.post(`/admin/recipes/${selectedRecipe._id}/reject`, {
        reason: rejectReason.trim(),
      });

      console.log(`Reject response:`, res.data);

      // Check for rejected flag OR 200 status as fallback
      const isSuccessful = res.status === 200 && (res.data.rejected === true || res.data.success === true);

      if (isSuccessful) {
        // Update local state
        setRecipes((prev) => 
          prev.filter((r) => r._id !== selectedRecipe._id)
        );
        setTotal((prev) => Math.max(0, prev - 1));
        
        notifySuccess(
          `Recipe has been rejected. The author has been notified of your feedback.`,
          "Recipe Rejected"
        );
        
        closeModal();
        setRejectReason("");
      } else {
        const msg = res.data.message || "Failed to reject recipe";
        notifyError(msg, "Rejection Failed");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to reject recipe";
      console.error("Reject error:", err);
      notifyError(msg, "Rejection Failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Open reject dialog
  const openRejectDialog = (recipe) => {
    setSelectedRecipe(recipe);
    setShowRejectDialog(true);
  };

  // Load more
  const handleLoadMore = () => {
    if (page >= totalPages) return;
    fetchRecipes(page + 1);
  };

  // Status change
  const handleStatusChange = (status) => {
    setStatusFilter(status);
    setShowSortDropdown(false);
    setPage(1);
  };

  // ===== Bulk Actions =====

  // Toggle individual checkbox
  const toggleRecipeSelection = (recipeId) => {
    setSelectedRecipeIds((prev) => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      // Update select all state
      setSelectAll(next.size === filteredRecipes.length && filteredRecipes.length > 0);
      return next;
    });
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectAll) {
      // Deselect all
      setSelectedRecipeIds(new Set());
    } else {
      // Select all filtered recipes
      const allIds = new Set(filteredRecipes.map((r) => r._id));
      setSelectedRecipeIds(allIds);
    }
    setSelectAll(!selectAll);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedRecipeIds(new Set());
    setSelectAll(false);
  };

  // Bulk approve handler
  const handleBulkApprove = async () => {
    const selectedCount = selectedRecipeIds.size;
    if (selectedCount === 0) return;

    const confirmed = await notifyConfirm(
      `Are you sure you want to approve ${selectedCount} recipe${selectedCount !== 1 ? 's' : ''}? This will make them visible to all users.`,
      "Approve Recipes",
      { confirmLabel: "Approve" }
    );

    if (!confirmed) return;

    setBulkActionProgress({
      active: true,
      current: 0,
      total: selectedCount,
      action: 'approve',
      errors: [],
      results: []
    });

    // Show progress modal
    if (bulkProgressModalRef.current) {
      bulkProgressModalRef.current.showModal();
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const recipeId of selectedRecipeIds) {
      try {
        const recipe = recipes.find((r) => r._id === recipeId);
        if (!recipe) {
          console.error(`Recipe not found for ID: ${recipeId}`);
          errorCount++;
          continue;
        }

        console.log(`Approving recipe:`, recipe.title);
        const res = await apiClient.post(`/admin/recipes/${recipeId}/approve`);

        console.log(`Approve response for ${recipe.title}:`, res.data);

        // Check for approved flag OR 200 status as fallback
        const isSuccessful = res.status === 200 && (res.data.approved === true || res.data.success === true);

        if (isSuccessful) {
          successCount++;
          console.log(`✓ Approved: ${recipe.title}`);
          setBulkActionProgress((prev) => ({
            ...prev,
            current: prev.current + 1,
            results: [...prev.results, recipeId]
          }));
        } else {
          // API returned 200 but approved is false
          errorCount++;
          console.error(`✗ Failed to approve: ${recipe.title}`, res.data);
          setBulkActionProgress((prev) => ({
            ...prev,
            current: prev.current + 1,
            errors: [...prev.errors, {
              recipeId,
              title: recipe?.title || 'Unknown',
              error: res.data.message || 'API returned unsuccessful'
            }]
          }));
        }
      } catch (err) {
        errorCount++;
        const recipe = recipes.find((r) => r._id === recipeId);
        console.error(`✗ Error approving recipe:`, recipe?.title, err);
        errors.push({
          recipeId,
          title: recipe?.title || 'Unknown',
          error: err.response?.data?.message || err.message
        });
        setBulkActionProgress((prev) => ({
          ...prev,
          current: prev.current + 1,
          errors: [...prev.errors, {
            recipeId,
            title: recipe?.title || 'Unknown',
            error: err.response?.data?.message || err.message
          }]
        }));
      }
    }

    console.log(`Bulk approve complete: ${successCount} success, ${errorCount} errors`);

    // Update local state - remove approved recipes
    setRecipes((prev) => prev.filter((r) => !selectedRecipeIds.has(r._id)));
    setTotal((prev) => Math.max(0, prev - successCount));
    clearSelection();

    // Show completion message
    setBulkActionProgress((prev) => ({
      ...prev,
      active: false
    }));

    setTimeout(() => {
      if (errorCount === 0) {
        notifySuccess(
          `Successfully approved ${successCount} recipe${successCount !== 1 ? 's' : ''}.`,
          "Batch Complete"
        );
      } else {
        notifyError(
          `Approved ${successCount} recipe${successCount !== 1 ? 's' : ''}, failed for ${errorCount}. Check details for more information.`,
          "Partial Success"
        );
      }
      bulkProgressModalRef.current?.close();
    }, 1500);
  };

  // Open bulk reject dialog
  const openBulkRejectDialog = () => {
    const selectedCount = selectedRecipeIds.size;
    if (selectedCount === 0) return;

    setBulkRejectDialogOpen(true);
    setBulkRejectReason("");
  };

  // Handle bulk reject
  const handleBulkReject = async () => {
    if (!bulkRejectReason.trim()) {
      notifyError("Please provide a reason for rejection", "Reason Required");
      return;
    }

    setBulkRejectDialogOpen(false);
    
    // Start bulk reject with progress
    const selectedCount = selectedRecipeIds.size;
    const reason = bulkRejectReason.trim();

    setBulkActionProgress({
      active: true,
      current: 0,
      total: selectedCount,
      action: 'reject',
      errors: [],
      results: []
    });

    if (bulkProgressModalRef.current) {
      bulkProgressModalRef.current.showModal();
    }

    let successCount = 0;
    let errorCount = 0;

    for (const recipeId of selectedRecipeIds) {
      try {
        const recipe = recipes.find((r) => r._id === recipeId);
        if (!recipe) {
          console.error(`Recipe not found for ID: ${recipeId}`);
          errorCount++;
          continue;
        }

        console.log(`Rejecting recipe:`, recipe.title);
        const res = await apiClient.post(`/admin/recipes/${recipeId}/reject`, {
          reason: reason,
        });

        console.log(`Reject response for ${recipe.title}:`, res.data);

        // Check for rejected flag OR 200 status as fallback
        const isSuccessful = res.status === 200 && (res.data.rejected === true || res.data.success === true);

        if (isSuccessful) {
          successCount++;
          console.log(`✓ Rejected: ${recipe.title}`);
          setBulkActionProgress((prev) => ({
            ...prev,
            current: prev.current + 1,
            results: [...prev.results, recipeId]
          }));
        } else {
          // API returned 200 but rejected is false
          errorCount++;
          console.error(`✗ Failed to reject: ${recipe.title}`, res.data);
          setBulkActionProgress((prev) => ({
            ...prev,
            current: prev.current + 1,
            errors: [...prev.errors, {
              recipeId,
              title: recipe?.title || 'Unknown',
              error: res.data.message || 'API returned unsuccessful'
            }]
          }));
        }
      } catch (err) {
        errorCount++;
        const recipe = recipes.find((r) => r._id === recipeId);
        console.error(`✗ Error rejecting recipe:`, recipe?.title, err);
        setBulkActionProgress((prev) => ({
          ...prev,
          current: prev.current + 1,
          errors: [...prev.errors, {
            recipeId,
            title: recipe?.title || 'Unknown',
            error: err.response?.data?.message || err.message
          }]
        }));
      }
    }

    console.log(`Bulk reject complete: ${successCount} success, ${errorCount} errors`);

    // Update local state - remove rejected recipes
    setRecipes((prev) => prev.filter((r) => !selectedRecipeIds.has(r._id)));
    setTotal((prev) => Math.max(0, prev - successCount));
    clearSelection();

    // Show completion message
    setBulkActionProgress((prev) => ({
      ...prev,
      active: false
    }));

    setTimeout(() => {
      if (errorCount === 0) {
        notifySuccess(
          `Successfully rejected ${successCount} recipe${successCount !== 1 ? 's' : ''}.`,
          "Batch Complete"
        );
      } else {
        notifyError(
          `Rejected ${successCount} recipe${successCount !== 1 ? 's' : ''}, failed for ${errorCount}. Check details for more information.`,
          "Partial Success"
        );
      }
      bulkProgressModalRef.current?.close();
      setBulkRejectReason("");
    }, 1500);
  };

  // Clear selection when page changes or filter changes
  useEffect(() => {
    clearSelection();
  }, [page, searchQuery, statusFilter]);

  const modalIngredientList = selectedRecipe
    ? splitIngredients(selectedRecipe.ingredients ?? "")
    : [];

  const modalStepList = selectedRecipe
    ? splitInstructions(selectedRecipe.instructions ?? "")
    : [];

  const currentStatusLabel = STATUS_FILTERS.find((s) => s.value === statusFilter)?.label || {
  pending_review: "Pending Review",
  published: "Approved (Published)",
  rejected: "Rejected"
}[statusFilter] || "Filter";

  return (
    <section className="admin-review" aria-label="Admin Recipe Review">
      <div className="admin-review__inner">
        {/* Header */}
        <header className="admin-review__header">
          <div className="admin-review__header-icon">
            <Shield size={32} />
          </div>
          <div>
            <h1 className="admin-review__title">Recipe Review Panel</h1>
            <p className="admin-review__subtitle">
              Moderate and approve community-submitted recipes
            </p>
          </div>
        </header>

        {/* Toolbar */}
        <div className="admin-review__toolbar">
          {/* Stats */}
          <div className="admin-review__stats">
            <div className="admin-review__stat">
              <span className="admin-review__stat-value">{total}</span>
              <span className="admin-review__stat-label">
                {statusFilter === "pending_review" ? "Pending" : 
                 statusFilter === "published" ? "Approved" : statusFilter}
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="admin-review__filters">
            {/* Search */}
            <div className="admin-review__search">
              <Search size={16} />
              <input
                type="search"
                className="admin-review__search-input"
                placeholder="Search recipes or authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search recipes"
              />
              {searchQuery.trim() && (
                <button
                  type="button"
                  className="admin-review__search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status filter */}
            <div className="admin-review__filter" ref={sortDropdownRef}>
              <button
                type="button"
                className="admin-review__filter-btn"
                onClick={() => setShowSortDropdown((o) => !o)}
              >
                <Filter size={14} />
                <span>{currentStatusLabel}</span>
                <ChevronDown size={14} className={showSortDropdown ? "admin-review__filter-chevron--open" : ""} />
              </button>
              {showSortDropdown && (
                <div className="admin-review__filter-dropdown">
                  {STATUS_FILTERS.map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      className={`admin-review__filter-option ${
                        statusFilter === filter.value ? "admin-review__filter-option--active" : ""
                      }`}
                      onClick={() => handleStatusChange(filter.value)}
                    >
                      {filter.label}
                      {statusFilter === filter.value && <span className="admin-review__filter-check">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="admin-review__error">
            <AlertCircle size={24} />
            <div className="admin-review__error-content">
              <p className="admin-review__error-title">Failed to load recipes</p>
              <p className="admin-review__error-message">{error}</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && !error && (
          <div className="admin-review__loading" role="status" aria-live="polite">
            <div className="admin-review__spinner"></div>
            <span>Loading recipes...</span>
          </div>
        )}

        {/* Recipe table */}
        {!loading && !error && (
          <>
            {/* Bulk actions bar */}
            {selectedRecipeIds.size > 0 && (
              <div className="admin-review__bulk-actions">
                <div className="admin-review__bulk-info">
                  <CheckSquare size={16} className="admin-review__bulk-icon" />
                  <span className="admin-review__bulk-count">
                    {selectedRecipeIds.size} recipe{selectedRecipeIds.size !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="admin-review__bulk-buttons">
                  <button
                    type="button"
                    className="admin-review__bulk-btn admin-review__bulk-btn--reject"
                    onClick={openBulkRejectDialog}
                    title="Reject selected"
                    disabled={bulkActionProgress.active}
                  >
                    <Trash2 size={16} />
                    Reject Selected
                  </button>
                  <button
                    type="button"
                    className="admin-review__bulk-btn admin-review__bulk-btn--approve"
                    onClick={handleBulkApprove}
                    title="Approve selected"
                    disabled={bulkActionProgress.active}
                  >
                    <CheckCircle size={16} />
                    Approve Selected
                  </button>
                  <button
                    type="button"
                    className="admin-review__bulk-btn admin-review__bulk-btn--clear"
                    onClick={clearSelection}
                    title="Clear selection"
                    disabled={bulkActionProgress.active}
                  >
                    <RotateCcw size={16} />
                    Clear
                  </button>
                </div>
              </div>
            )}

            {filteredRecipes.length > 0 ? (
              <div className="admin-review__table-wrapper">
                <table className="admin-review__table">
                  <thead>
                    <tr>
                      <th className="admin-review__th admin-review__th--checkbox">
                        <button
                          type="button"
                          className="admin-review__checkbox-button"
                          onClick={toggleSelectAll}
                          aria-label={selectAll ? "Deselect all" : "Select all"}
                          title={selectAll ? "Deselect all" : "Select all recipes on this page"}
                        >
                          {selectAll ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </th>
                      <th className="admin-review__th admin-review__th--title">Recipe</th>
                      <th className="admin-review__th admin-review__th--author">Author</th>
                      <th className="admin-review__th admin-review__th--status">Status</th>
                      <th className="admin-review__th admin-review__th--date">Submitted</th>
                      <th className="admin-review__th admin-review__th--actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecipes.map((recipe) => (
                      <tr 
                        key={recipe._id} 
                        className={`admin-review__row ${
                          selectedRecipeIds.has(recipe._id) ? "admin-review__row--selected" : ""
                        }`}
                      >
                        <td className="admin-review__cell admin-review__cell--checkbox">
                          <button
                            type="button"
                            className={`admin-review__checkbox-button admin-review__checkbox-button--row ${
                              selectedRecipeIds.has(recipe._id) ? "admin-review__checkbox-button--checked" : ""
                            }`}
                            onClick={() => toggleRecipeSelection(recipe._id)}
                            aria-label={selectedRecipeIds.has(recipe._id) ? "Deselect recipe" : "Select recipe"}
                          >
                            {selectedRecipeIds.has(recipe._id) ? <CheckSquare size={18} /> : <Square size={18} />}
                          </button>
                        </td>
                        <td className="admin-review__cell admin-review__cell--title">
                          <div className="admin-review__recipe-title">{recipe.title}</div>
                        </td>
                        <td className="admin-review__cell admin-review__cell--author">
                          <User size={14} />
                          <span>{getAuthorName(recipe.author)}</span>
                        </td>
                        <td className="admin-review__cell admin-review__cell--status">
                          <span className={`admin-review__status-badge admin-review__status-badge--${recipe.status}`}>
                            {recipe.status}
                          </span>
                        </td>
                        <td className="admin-review__cell admin-review__cell--date">
                          <Clock size={14} />
                          <span>{formatDate(recipe.createdAt)}</span>
                        </td>
                        <td className="admin-review__cell admin-review__cell--actions">
                          <div className="admin-review__action-buttons">
                            <button
                              type="button"
                              className="admin-review__btn admin-review__btn--view"
                              onClick={() => openRecipeDetail(recipe)}
                              title="View recipe"
                              aria-label="View recipe details"
                            >
                              <Eye size={16} />
                            </button>
                            {recipe.status === "pending" && (
                              <>
                                <button
                                  type="button"
                                  className="admin-review__btn admin-review__btn--approve"
                                  onClick={() => handleApprove(recipe)}
                                  title="Approve"
                                  aria-label="Approve recipe"
                                  disabled={actionLoading}
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="admin-review__btn admin-review__btn--reject"
                                  onClick={() => openRejectDialog(recipe)}
                                  title="Reject"
                                  aria-label="Reject recipe"
                                  disabled={actionLoading}
                                >
                                  <X size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-review__empty">
                <CheckCircle size={48} />
                <h2>No recipes found</h2>
                <p>
                  {searchQuery.trim() ? "Try a different search term." : "No recipes in this category."}
                </p>
              </div>
            )}

            {/* Load more */}
            {page < totalPages && (
              <div className="admin-review__load-more">
                <button
                  type="button"
                  className="admin-review__load-btn"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Recipe Detail Modal */}
      <dialog
        ref={dialogRef}
        className="admin-review__modal"
        aria-labelledby="admin-recipe-modal-title"
        onClose={handleDialogClose}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        {selectedRecipe && !showRejectDialog && (
          <div className="admin-review__modal-panel" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="admin-review__modal-close"
              onClick={closeModal}
              aria-label="Close"
            >
              ×
            </button>

            <h2 id="admin-recipe-modal-title" className="admin-review__modal-title">
              {selectedRecipe.title}
            </h2>

            <div className="admin-review__modal-meta">
              <span className="admin-review__meta-item">
                <ChefHat size={14} />
                By {getAuthorName(selectedRecipe.author)}
              </span>
              <span className="admin-review__meta-item">
                <Clock size={14} />
                Submitted {formatDate(selectedRecipe.createdAt)}
              </span>
              <span className="admin-review__meta-item">
                User: {selectedRecipe.author?.email || "N/A"}
              </span>
            </div>

            <h3 className="admin-review__modal-subtitle">Ingredients</h3>
            {modalIngredientList.length > 0 ? (
              <ul className="admin-review__modal-list">
                {modalIngredientList.map((item, i) => (
                  <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                ))}
              </ul>
            ) : (
              <p className="admin-review__modal-empty">No ingredient list included.</p>
            )}

            <h3 className="admin-review__modal-subtitle">Instructions</h3>
            {modalStepList.length > 0 ? (
              <ol className="admin-review__modal-steps">
                {modalStepList.map((step, i) => (
                  <li key={i}>{typeof step === 'string' ? step : JSON.stringify(step)}</li>
                ))}
              </ol>
            ) : (
              <p className="admin-review__modal-empty">No instructions included.</p>
            )}

            {selectedRecipe.status === "pending" && (
              <div className="admin-review__modal-actions">
                <button
                  type="button"
                  className="admin-review__btn admin-review__btn--modal-reject"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={actionLoading}
                >
                  <X size={18} />
                  Reject
                </button>
                <button
                  type="button"
                  className="admin-review__btn admin-review__btn--modal-approve"
                  onClick={() => handleApprove(selectedRecipe)}
                  disabled={actionLoading}
                >
                  <Check size={18} />
                  Approve Recipe
                </button>
              </div>
            )}
          </div>
        )}

        {/* Reject Dialog */}
        {selectedRecipe && showRejectDialog && (
          <div className="admin-review__modal-panel admin-review__modal-panel--reject" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="admin-review__modal-close"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason("");
              }}
              aria-label="Close"
            >
              ×
            </button>

            <h2 className="admin-review__modal-title">Reject Recipe</h2>
            <p className="admin-review__reject-recipe-title">{selectedRecipe.title}</p>

            <div className="admin-review__reject-form">
              <label htmlFor="rejectReason" className="admin-review__reject-label">
                Reason for rejection <span className="required">*</span>
              </label>
              <textarea
                id="rejectReason"
                className="admin-review__reject-textarea"
                placeholder="Please explain why this recipe is being rejected. This feedback will be shared with the author (e.g., 'Incomplete instructions', 'Inappropriate content', 'Recipe contains false information')"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={5}
                maxLength={5000}
                aria-label="Reason for rejection"
              />
              <div className="admin-review__reject-char-count">
                {rejectReason.length} / 5000
              </div>
            </div>

            <div className="admin-review__modal-actions">
              <button
                type="button"
                className="admin-review__btn admin-review__btn--modal-cancel"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReason("");
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-review__btn admin-review__btn--modal-confirm"
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
              >
                <X size={18} />
                {actionLoading ? "Rejecting..." : "Reject Recipe"}
              </button>
            </div>
          </div>
        )}
      </dialog>

      {/* Bulk Reject Dialog - Separate from recipe detail modal */}
      <dialog
        ref={bulkRejectDialogRef}
        className="admin-review__modal"
        aria-labelledby="bulk-reject-title"
        onClose={() => {
          setBulkRejectDialogOpen(false);
          setBulkRejectReason("");
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setBulkRejectDialogOpen(false);
            setBulkRejectReason("");
          }
        }}
      >
        {bulkRejectDialogOpen && (
          <div className="admin-review__modal-panel admin-review__modal-panel--reject" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="admin-review__modal-close"
              onClick={() => {
                setBulkRejectDialogOpen(false);
                setBulkRejectReason("");
              }}
              aria-label="Close"
            >
              ×
            </button>

            <h2 id="bulk-reject-title" className="admin-review__modal-title">Reject {selectedRecipeIds.size} Recipes</h2>
            <p className="admin-review__reject-recipe-title">
              {selectedRecipeIds.size} recipe{selectedRecipeIds.size !== 1 ? 's' : ''} will be rejected
            </p>

            <div className="admin-review__reject-form">
              <label htmlFor="bulkRejectReason" className="admin-review__reject-label">
                Reason for rejection <span className="required">*</span>
              </label>
              <textarea
                id="bulkRejectReason"
                className="admin-review__reject-textarea"
                placeholder="Please explain why these recipes are being rejected. This feedback will be shared with all authors."
                value={bulkRejectReason}
                onChange={(e) => setBulkRejectReason(e.target.value)}
                rows={5}
                maxLength={5000}
                aria-label="Reason for rejection"
              />
              <div className="admin-review__reject-char-count">
                {bulkRejectReason.length} / 5000
              </div>
            </div>

            <div className="admin-review__modal-actions">
              <button
                type="button"
                className="admin-review__btn admin-review__btn--modal-cancel"
                onClick={() => {
                  setBulkRejectDialogOpen(false);
                  setBulkRejectReason("");
                }}
                disabled={bulkActionProgress.active}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-review__btn admin-review__btn--modal-confirm"
                onClick={handleBulkReject}
                disabled={bulkActionProgress.active || !bulkRejectReason.trim()}
              >
                <X size={18} />
                {bulkActionProgress.active ? "Rejecting..." : "Reject All Recipes"}
              </button>
            </div>
          </div>
        )}
      </dialog>

      {/* Bulk Action Progress Modal */}
      <dialog
        ref={bulkProgressModalRef}
        className="admin-review__modal"
        aria-labelledby="bulk-progress-title"
      >
        <div className="admin-review__modal-panel admin-review__modal-panel--progress" onClick={(e) => e.stopPropagation()}>
          <h2 id="bulk-progress-title" className="admin-review__modal-title">
            {bulkActionProgress.active ? "Processing..." : "Batch Complete"}
          </h2>

          {bulkActionProgress.active ? (
            <div className="admin-review__progress-content">
              <div className="admin-review__progress-bar-wrapper">
                <div 
                  className="admin-review__progress-bar" 
                  style={{ 
                    width: `${(bulkActionProgress.current / bulkActionProgress.total) * 100}%` 
                  }}
                ></div>
              </div>
              <div className="admin-review__progress-text">
                <span className="admin-review__progress-current">{bulkActionProgress.current}</span>
                <span className="admin-review__progress-separator">/</span>
                <span className="admin-review__progress-total">{bulkActionProgress.total}</span>
                <span className="admin-review__progress-action">
                  {bulkActionProgress.action === 'approve' ? 'recipes approved' : 'recipes rejected'}
                </span>
              </div>
              {bulkActionProgress.errors.length > 0 && (
                <div className="admin-review__progress-errors">
                  <AlertCircle size={16} />
                  <span>{bulkActionProgress.errors.length} error{bulkActionProgress.errors.length !== 1 ? 's' : ''} occurred</span>
                </div>
              )}
            </div>
          ) : (
            <div className="admin-review__progress-complete">
              <CheckCircle size={64} className="admin-review__complete-icon" />
              <p className="admin-review__complete-message">
                {bulkActionProgress.action === 'approve'
                  ? `${bulkActionProgress.results.length} recipe${bulkActionProgress.results.length !== 1 ? 's' : ''} approved`
                  : `${bulkActionProgress.results.length} recipe${bulkActionProgress.results.length !== 1 ? 's' : ''} rejected`}
              </p>

              {bulkActionProgress.errors.length > 0 && (
                <div className="admin-review__error-list">
                  <h4>Errors ({bulkActionProgress.errors.length})</h4>
                  <ul className="admin-review__error-items">
                    {bulkActionProgress.errors.map((err, idx) => (
                      <li key={idx}>
                        <strong>{err.title}</strong>: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                className="admin-review__btn admin-review__btn--modal-approve"
                onClick={() => bulkProgressModalRef.current?.close()}
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </dialog>
    </section>
  );
};

export default AdminRecipeReview;