import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Calendar, Mail, Package, Phone, Search, User } from "lucide-react";
import { apiClient, apiUrl } from "../config";
import { DONATION_IMAGE_FALLBACK } from "../utils/donationImageFallback";
import "../feed.css";

const PAGE_SIZE = 9;

const getDisplayText = (value, fallback = "N/A") => {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const formatDate = (dateInput) => {
  const parsedDate = new Date(dateInput);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Not specified";
  }
  return parsedDate.toLocaleDateString();
};

const getTelHref = (contact) => {
  if (!contact || typeof contact !== "string") return null;
  const digits = contact.replace(/[^\d+]/g, "");
  if (digits.length < 7) return null;
  return `tel:${digits}`;
};

const isLikelyEmail = (value) =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

function normalizeFeedPayload(data) {
  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: 1,
      totalPages: 1,
    };
  }
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    items,
    total: typeof data?.total === "number" ? data.total : items.length,
    page: typeof data?.page === "number" ? data.page : 1,
    totalPages: typeof data?.totalPages === "number" ? Math.max(1, data.totalPages) : 1,
  };
}

const Feed = () => {
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const lastSearchRef = useRef(debouncedQuery);
  const skipFetchRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 320);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return undefined;
    }

    const searchChanged = lastSearchRef.current !== debouncedQuery;
    if (searchChanged) {
      lastSearchRef.current = debouncedQuery;
    }
    const reqPage = searchChanged ? 1 : page;

    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get("/feed", {
          params: {
            page: reqPage,
            limit: PAGE_SIZE,
            ...(debouncedQuery ? { search: debouncedQuery } : {}),
          },
          signal: ac.signal,
        });
        const { items, total: tTotal, totalPages: tp } = normalizeFeedPayload(response?.data);
        setPosts(items);
        setTotal(tTotal);
        setTotalPages(tp);
      } catch (requestError) {
        if (
          (axios.isCancel && axios.isCancel(requestError)) ||
          requestError.code === "ERR_CANCELED" ||
          requestError.name === "CanceledError"
        ) {
          return;
        }
        console.error("Error fetching posts:", requestError);
        const msg =
          requestError.response?.data?.error ||
          requestError.message ||
          "Failed to load posts.";
        setError(typeof msg === "string" ? msg : "Failed to load posts. Please try again later.");
        if (requestError.response?.status === 401) {
          setTimeout(() => navigate("/login"), 1500);
        }
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    if (searchChanged && page !== 1) {
      skipFetchRef.current = true;
      setPage(1);
    }

    return () => ac.abort();
  }, [page, debouncedQuery, refreshNonce, navigate]);

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const hasPosts = posts.length > 0;
  const emptyFeed = !loading && !error && total === 0 && !debouncedQuery;
  const searchNoMatch = !loading && !error && total === 0 && debouncedQuery.length > 0;

  const handleRefresh = () => setRefreshNonce((n) => n + 1);

  return (
    <div className="feed-page">
      <div className="feed-page__inner">
        <header className="feed-hero">
          <h1 className="feed-hero__title">Community feed</h1>
          <p className="feed-hero__lede">
            Browse food donations that are still available. Reach out using the contact details on
            each card — call or email the donor directly.
          </p>
          <div className="feed-hero__toolbar">
            <div className="feed-search">
              <Search className="feed-search__icon" aria-hidden />
              <input
                type="search"
                className="feed-search__input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by item, donor, email, or notes…"
                aria-label="Filter donations"
                autoComplete="off"
              />
            </div>
            <button type="button" className="feed-refresh" onClick={handleRefresh} disabled={loading}>
              Refresh
            </button>
          </div>
        </header>

        {loading ? (
          <div className="feed-panel">
            <div className="feed-spinner" aria-hidden />
            <p className="feed-panel__text">Loading donations…</p>
          </div>
        ) : error ? (
          <div className="feed-panel feed-panel--error">
            <p className="feed-panel__text">{error}</p>
            <button type="button" className="feed-retry" onClick={handleRefresh}>
              Try again
            </button>
          </div>
        ) : emptyFeed ? (
          <div className="feed-panel">
            <h2 className="feed-panel__title">No listings yet</h2>
            <p className="feed-panel__text">
              When donors share food, it will show up here. You can post a donation from the donation
              form if you have surplus to share.
            </p>
          </div>
        ) : searchNoMatch ? (
          <div className="feed-panel">
            <h2 className="feed-panel__title">No matches</h2>
            <p className="feed-panel__text">
              Nothing matches &ldquo;{debouncedQuery}&rdquo;. Try another keyword or clear the search.
            </p>
            <button type="button" className="feed-retry" onClick={() => setQuery("")}>
              Clear search
            </button>
          </div>
        ) : (
          <>
            <div className="feed-grid">
              {hasPosts &&
                posts.map((post) => {
                  const itemName = getDisplayText(post.item, "Untitled item");
                  const donorName = post.anonymous
                    ? "Anonymous"
                    : getDisplayText(post.donatedBy, "Unknown donor");
                  const contact = getDisplayText(post.contact, "");
                  const contactDisplay = contact || "Not shared";
                  const additionalInfo = getDisplayText(post.additionalInfo, "");
                  const notesDisplay =
                    additionalInfo && additionalInfo !== "N/A" ? additionalInfo : "";
                  const emailRaw = typeof post.email === "string" ? post.email.trim() : "";
                  const mailto =
                    emailRaw && isLikelyEmail(emailRaw) ? `mailto:${emailRaw}` : null;
                  const telHref = getTelHref(contact);
                  const servings =
                    typeof post.servings === "number" && post.servings > 0 ? post.servings : null;

                  return (
                    <article key={post._id} className="feed-card">
                      <div className="feed-card__media">
                        <img
                          src={`${apiUrl}/donations/${post._id}/image`}
                          alt={itemName}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = DONATION_IMAGE_FALLBACK;
                          }}
                        />
                      </div>
                      <div className="feed-card__body">
                        <h2 className="feed-card__title">{itemName}</h2>
                        <div className="feed-card__meta">
                          <p className="feed-card__row">
                            <User size={16} strokeWidth={2} aria-hidden />
                            <span>{donorName}</span>
                          </p>
                          {servings != null && (
                            <p className="feed-card__row">
                              <Package size={16} strokeWidth={2} aria-hidden />
                              <span>
                                {servings} serving{servings === 1 ? "" : "s"}
                              </span>
                            </p>
                          )}
                          <p className="feed-card__row">
                            <Phone size={16} strokeWidth={2} aria-hidden />
                            <span>{contactDisplay}</span>
                          </p>
                          <p className="feed-card__row">
                            <Calendar size={16} strokeWidth={2} aria-hidden />
                            <span>Good until {formatDate(post.expiryDate)}</span>
                          </p>
                          {emailRaw ? (
                            <p className="feed-card__row">
                              <Mail size={16} strokeWidth={2} aria-hidden />
                              <span>{emailRaw}</span>
                            </p>
                          ) : null}
                        </div>
                        {notesDisplay ? (
                          <p className="feed-card__notes">{notesDisplay}</p>
                        ) : null}
                        {(telHref || mailto) && (
                          <div className="feed-card__actions">
                            {telHref ? (
                              <a className="feed-card__link" href={telHref}>
                                Call
                              </a>
                            ) : null}
                            {mailto ? (
                              <a className="feed-card__link" href={mailto}>
                                Email
                              </a>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
            </div>

            {!loading && !error && total > 0 && (
              <nav className="feed-pagination" aria-label="Feed pagination">
                <p className="feed-pagination__meta">
                  Showing {rangeStart}–{rangeEnd} of {total}
                </p>
                {totalPages > 1 ? (
                  <div className="feed-pagination__controls">
                    <button
                      type="button"
                      className="feed-pagination__btn"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span className="feed-pagination__page">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      className="feed-pagination__btn"
                      disabled={page >= totalPages || loading}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Feed;
