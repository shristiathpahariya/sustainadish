import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { Trash2 } from "lucide-react";
import "../.././src/Profile.css";
import { useUser } from "../UserContext";
import { useMessageDialog } from "../context/MessageDialogContext";
import { apiClient, apiUrl } from "../config";
import { splitIngredients, splitInstructions } from "../utils/recipeText";
import { DONATION_IMAGE_FALLBACK } from "../utils/donationImageFallback";
import "../.././src/post.css";

const canDeletePost = (post, user) => {
  if (!user || !post) return false;
  const uid =
    user._id != null ? String(user._id) : user.id != null ? String(user.id) : "";
  const postUid = post.userId != null ? String(post.userId) : "";
  if (postUid && uid && postUid === uid) return true;
  const uEmail = (typeof user.email === "string" ? user.email : "").trim().toLowerCase();
  const pEmail = (typeof post.email === "string" ? post.email : "").trim().toLowerCase();
  if (!postUid && uEmail && pEmail && uEmail === pEmail) return true;
  return false;
};

const Profile = () => {
  const { user } = useUser();
  const { notifySuccess, notifyError, notifyConfirm } = useMessageDialog();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const [userData, setUserData] = useState({
    name: "",
    location: "",
    email: "",
    profilePicture: "/user.png",
  });
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [selectedSaved, setSelectedSaved] = useState(null);
  const [removingSavedRecipeId, setRemovingSavedRecipeId] = useState(null);
  const postsContainerRef = useRef(null);

  useEffect(() => {
    const updateUserData = () => {
      if (user) {
        setUserData({
          name: user.name || `${user.firstName} ${user.lastName}`,
          location: user.location || "N/A",
          email: user.email || "N/A",
          profilePicture: user.profilePicture || "/user.png",
        });
      }
    };
    updateUserData();
    window.addEventListener("storage", updateUserData);
    return () => window.removeEventListener("storage", updateUserData);
  }, [user]);

  useEffect(() => {
    const fetchUserDonations = async () => {
      const userEmail = typeof user?.email === "string" ? user.email.trim() : "";
      const userId = user?._id || user?.id || "";
      if (!user || (!userEmail && !userId)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await apiClient.get("/user/donations", {
          params: {
            ...(userEmail ? { email: userEmail } : {}),
            ...(userId ? { userId } : {}),
          },
        });
        setPosts(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error fetching donations:", error);
        if (error.response?.status === 401) navigateRef.current("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchUserDonations();
  }, [user]);

  useEffect(() => {
    const fetchSavedRecipes = async () => {
      const uid = user?._id || user?.id;
      if (!user || !uid) {
        setSavedRecipes([]);
        setLoadingSaved(false);
        return;
      }
      setLoadingSaved(true);
      try {
        const response = await apiClient.get("/saved-recipes");
        const list = Array.isArray(response.data?.savedRecipes) ? response.data.savedRecipes : [];
        setSavedRecipes(list);
      } catch (error) {
        console.error("Error fetching saved recipes:", error);
        if (error.response?.status === 401) navigateRef.current("/login");
        setSavedRecipes([]);
      } finally {
        setLoadingSaved(false);
      }
    };
    fetchSavedRecipes();
  }, [user]);

  // Profile entrance
  useEffect(() => {
    gsap.to(".profile-info", {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: "power3.out",
      delay: 0.2,
    });
  }, []);

  // Post cards entrance — animate from hidden using scoped nodes so cards never stay opacity:0
  useLayoutEffect(() => {
    if (posts.length === 0 || !postsContainerRef.current) return;
    const cards = postsContainerRef.current.querySelectorAll(".post-card");
    if (cards.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.from(cards, {
        opacity: 0,
        y: 30,
        duration: 0.7,
        ease: "power2.out",
        stagger: 0.1,
        delay: 0.15,
      });
    }, postsContainerRef);

    return () => ctx.revert();
  }, [posts]);

  const handleEdit = () => navigateRef.current("/editprofile");
  const handleCommunityFeed = () => navigateRef.current("/feed");

  const handleDeletePost = async (post, event) => {
    if (event) event.stopPropagation();
    if (!canDeletePost(post, user)) return;
    const id = post._id;
    const ok = await notifyConfirm(
      "Remove this donation from the community feed? This cannot be undone.",
      "Remove donation",
      { confirmLabel: "Delete" }
    );
    if (!ok) return;
    setDeletingId(id);
    try {
      await apiClient.delete(`/donations/${id}`);
      setPosts((prev) => prev.filter((p) => p._id !== id));
      if (selectedPost && selectedPost._id === id) {
        setSelectedPost(null);
      }
      notifySuccess("Your donation listing has been removed.", "Deleted");
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Could not delete this post.";
      notifyError(typeof msg === "string" ? msg : "Could not delete this post.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRemoveSavedRecipe = async (recipeMongoId, event) => {
    if (event) event.stopPropagation();
    if (!recipeMongoId) return;
    const ok = await notifyConfirm(
      "Remove this recipe from your saved list? This cannot be undone.",
      "Remove saved recipe",
      { confirmLabel: "Remove" }
    );
    if (!ok) return;
    setRemovingSavedRecipeId(recipeMongoId);
    try {
      await apiClient.delete(`/saved-recipes/recipe/${recipeMongoId}`);
      setSavedRecipes((prev) =>
        prev.filter((row) => String(row.recipe?._id) !== String(recipeMongoId))
      );
      if (selectedSaved && String(selectedSaved.recipe?._id) === String(recipeMongoId)) {
        setSelectedSaved(null);
      }
      notifySuccess("Recipe removed from your profile.", "Saved recipes");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Could not remove this recipe.";
      notifyError(typeof msg === "string" ? msg : "Could not remove recipe.");
    } finally {
      setRemovingSavedRecipeId(null);
    }
  };

  const openSavedRecipePopup = (row) => {
    setSelectedSaved(row);
  };

  const closeSavedRecipePopup = (e) => {
    if (e && e.target !== e.currentTarget) return;
    setSelectedSaved(null);
  };

  const handlePostClick = (post) => {
    setSelectedPost(post);
    setTimeout(() => {
      const overlay = document.querySelector(".popup-overlay");
      if (overlay) overlay.classList.add("active");
      gsap.to(".popup-content", {
        y: 0,
        scale: 1,
        duration: 0.5,
        ease: "back.out(1.7)",
      });
    }, 10);
  };

  const animateClose = () => {
    gsap.to(".popup-content", {
      y: 20,
      scale: 0.95,
      duration: 0.3,
      ease: "power2.in",
    });
    const overlay = document.querySelector(".popup-overlay");
    if (overlay) overlay.classList.remove("active");
    gsap.to(".popup-overlay", {
      opacity: 0,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => setSelectedPost(null),
    });
  };

  const closePopup = (e) => {
    if (e && e.target !== e.currentTarget) return;
    animateClose();
  };

  // derive a simple tag list from post data
  const getRecipeTags = (post) => {
    const tags = [];
    if (post.additionalInfo?.toLowerCase().includes("veg")) tags.push("Vegetarian");
    if (post.additionalInfo?.toLowerCase().includes("spicy")) tags.push("Spicy");
    if (post.category) tags.push(post.category);
    return tags.slice(0, 3);
  };

  return (
    <div className="profile-page-container">
      {/* ── Profile header ── */}
      <div className="profile-info">
        <div className="profile-picture-container">
          <img
            src={userData.profilePicture}
            alt="Profile"
            className="profile-picture"
            onError={(e) => { e.target.onerror = null; e.target.src = "/user.png"; }}
          />
        </div>
        <div className="profile-details">
          <div className="profile-name-line">
            <span className="profile-name">{userData.name}</span>
            {/* <span className="profile-role-tag">Recipe curator</span> */}
          </div>
          <div className="profile-meta-row">
            <span><strong>{posts.length}</strong> posts</span>
            <span><strong>{userData.location}</strong></span>
            <span>{userData.email}</span>
          </div>
          {/* <p className="profile-tagline">
            Sharing home-cooked recipes from the kitchen
          </p> */}
        </div>
        <div className="profile-buttons">
          <button type="button" onClick={handleCommunityFeed} className="edit-btn edit-btn--ghost">
            Community feed
          </button>
          <button type="button" onClick={handleEdit} className="edit-btn">
            Edit profile
          </button>
        </div>
      </div>

      {/* ── Saved recipes ── */}
      <div className="separator-editorial">
        <div className="separator-inner">
          <div className="sep-line" />
          <div className="sep-diamond" />
          <span className="sep-label">Saved recipes</span>
          <div className="sep-diamond" />
          <div className="sep-line" />
        </div>
      </div>

      <div className="posts-section profile-saved-wrap">
        <p className="postshead">Recipe saves</p>
        <p className="postshead-sub">From your recommendation searches</p>
        <div className="saved-recipes-grid">
          {loadingSaved ? (
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#888780" }}>
              Loading saved recipes…
            </p>
          ) : savedRecipes.length > 0 ? (
            savedRecipes.map((row) => {
              const rec = row.recipe;
              if (!rec) return null;
              const rid = rec._id;
              return (
                <div
                  key={row._id}
                  className="saved-recipe-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => openSavedRecipePopup(row)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openSavedRecipePopup(row);
                    }
                  }}
                >
                  <button
                    type="button"
                    className="saved-recipe-card__remove"
                    aria-label={`Remove ${rec.title || "recipe"}`}
                    disabled={removingSavedRecipeId === rid}
                    onClick={(e) => handleRemoveSavedRecipe(rid, e)}
                  >
                    <Trash2 size={16} strokeWidth={2} aria-hidden />
                  </button>
                  <div className="saved-recipe-card__title">{rec.title}</div>
                  {row.savedAt && (
                    <div className="saved-recipe-card__meta">
                      Saved{" "}
                      {new Date(row.savedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#888780" }}>
              No saved recipes yet. Open Recommendations and save a recipe you like.
            </p>
          )}
        </div>
      </div>

      {/* ── Editorial divider ── */}
      <div className="separator-editorial">
        <div className="separator-inner">
          <div className="sep-line" />
          <div className="sep-diamond" />
          <span className="sep-label">Post collection</span>
          <div className="sep-diamond" />
          <div className="sep-line" />
        </div>
      </div>

      {/* ── Posts grid ── */}
      <div className="posts-section">
        <p className="postshead">Posts</p>
        <p className="postshead-sub">Shared with the community</p>

        <div className="posts-container" ref={postsContainerRef}>
          {loading ? (
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#888780" }}>
              Loading posts…
            </p>
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <div
                key={post._id}
                className="post-card"
                onClick={() => handlePostClick(post)}
              >
                {canDeletePost(post, user) && (
                  <button
                    type="button"
                    className="post-card__delete"
                    aria-label={`Delete ${post.item || "post"}`}
                    disabled={deletingId === post._id}
                    onClick={(e) => handleDeletePost(post, e)}
                  >
                    <Trash2 size={16} strokeWidth={2} aria-hidden />
                  </button>
                )}
                <img
                  src={`${apiUrl}/donations/${post._id}/image`}
                  alt={post.item}
                  className="post-image"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DONATION_IMAGE_FALLBACK;
                  }}
                />
                <div className="post-card-footer">
                  <span className="post-card-label">
                    {post.item}
                    {post.expiryDate && ` · ${new Date(post.expiryDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#888780" }}>
              No posts yet
            </p>
          )}
        </div>
      </div>

      {/* ── Saved recipe popup ── */}
      {selectedSaved && selectedSaved.recipe && (
        <div className="popup-overlay active" onClick={closeSavedRecipePopup}>
          <div
            className="popup-content popup-content--saved-recipe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="popup-header-bar">
              <span>Saved recipe</span>
              <button
                type="button"
                className="close-btn"
                onClick={() => setSelectedSaved(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="saved-recipe-popup__scroll">
              <div className="popup-details">
                <h3 className="saved-recipe-popup__title">{selectedSaved.recipe.title}</h3>
                <div className="popup-field saved-recipe-popup__block">
                  <strong>Ingredients</strong>
                  {splitIngredients(selectedSaved.recipe.ingredients).length > 0 ? (
                    <ul className="saved-recipe-popup__list">
                      {splitIngredients(selectedSaved.recipe.ingredients).map((line, idx) => (
                        <li key={idx}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontStyle: "italic", color: "#888780", margin: 0 }}>None listed.</p>
                  )}
                </div>
                <div className="popup-field saved-recipe-popup__block">
                  <strong>Instructions</strong>
                  {splitInstructions(selectedSaved.recipe.instructions).length > 0 ? (
                    <ol className="saved-recipe-popup__steps">
                      {splitInstructions(selectedSaved.recipe.instructions).map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  ) : (
                    <p style={{ fontStyle: "italic", color: "#888780", margin: 0 }}>None listed.</p>
                  )}
                </div>
                <div className="saved-recipe-popup__actions">
                  <button
                    type="button"
                    className="saved-recipe-popup__remove-btn"
                    disabled={removingSavedRecipeId === selectedSaved.recipe._id}
                    onClick={() => handleRemoveSavedRecipe(selectedSaved.recipe._id)}
                  >
                    {removingSavedRecipeId === selectedSaved.recipe._id
                      ? "Removing…"
                      : "Remove from saved"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Popup ── */}
      {selectedPost && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header-bar">
              <span>Post detail</span>
              <button className="close-btn" onClick={animateClose}>✕</button>
            </div>
            <img
              src={`${apiUrl}/donations/${selectedPost._id}/image`}
              alt={selectedPost.item}
              className="popup-image"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = DONATION_IMAGE_FALLBACK;
              }}
            />
            <div className="popup-details">
              <div className="popup-grid">
                <div className="popup-field">
                  <strong>Item</strong>
                  <span>{selectedPost.item}</span>
                </div>
                <div className="popup-field">
                  <strong>Shared by</strong>
                  <span>{selectedPost.anonymous ? "Anonymous" : selectedPost.donatedBy}</span>
                </div>
                <div className="popup-field">
                  <strong>Contact</strong>
                  <span>{selectedPost.contact}</span>
                </div>
                <div className="popup-field">
                  <strong>Expiry date</strong>
                  <span>{new Date(selectedPost.expiryDate).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="popup-field">
                <strong>Notes</strong>
                <span>{selectedPost.additionalInfo}</span>
              </div>
              {getRecipeTags(selectedPost).length > 0 && (
                <div className="popup-recipe-tags">
                  {getRecipeTags(selectedPost).map((tag) => (
                    <span key={tag} className="recipe-tag">{tag}</span>
                  ))}
                </div>
              )}
              {canDeletePost(selectedPost, user) && (
                <div className="popup-delete">
                  <button
                    type="button"
                    className="popup-delete__btn"
                    disabled={deletingId === selectedPost._id}
                    onClick={() => handleDeletePost(selectedPost)}
                  >
                    {deletingId === selectedPost._id ? "Deleting…" : "Delete this post"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;