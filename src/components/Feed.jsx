import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Calendar, Mail, Package, Phone, Search, User, X } from "lucide-react";
import { apiClient, apiUrl } from "../config";
import { DONATION_IMAGE_FALLBACK } from "../utils/donationImageFallback";
import { MapContainer, TileLayer, Marker, CircleMarker, useMap } from "react-leaflet";
import useGeolocation from '../hooks/useGeolocation';
import 'leaflet/dist/leaflet.css';
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

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

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

function donationIdEquals(a, b) {
  return String(a) === String(b);
}

function MapFlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (
      position &&
      typeof position[0] === "number" &&
      typeof position[1] === "number" &&
      Number.isFinite(position[0]) &&
      Number.isFinite(position[1])
    ) {
      const z = map.getZoom();
      map.flyTo(position, Math.max(z, 13), { duration: 0.45 });
    }
  }, [position?.[0], position?.[1], map]);
  return null;
}

function NearbyDonationDetailModal({ entry, onClose, closeBtnRef }) {
  const { d: post, dist: distKm } = entry;
  const itemName = getDisplayText(post.item, "Untitled item");
  const donorName = post.anonymous
    ? "Anonymous"
    : getDisplayText(post.donatedBy, "Unknown donor");
  const contact = getDisplayText(post.contact, "");
  const contactDisplay = contact || "Not shared";
  const additionalInfo = getDisplayText(post.additionalInfo, "");
  const notesDisplay = additionalInfo && additionalInfo !== "N/A" ? additionalInfo : "";
  const emailRaw = typeof post.email === "string" ? post.email.trim() : "";
  const mailto = emailRaw && isLikelyEmail(emailRaw) ? `mailto:${emailRaw}` : null;
  const telHref = getTelHref(contact);
  const servings =
    typeof post.servings === "number" && post.servings > 0 ? post.servings : null;

  return (
    <div
      className="feed-geo-modal-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="feed-geo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nearby-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="feed-geo-modal__img-wrap">
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
        <div className="feed-geo-modal__header">
          <h3 id="nearby-detail-title" className="feed-geo-modal__title">
            {itemName}
          </h3>
          <button
            ref={closeBtnRef}
            type="button"
            className="feed-geo-modal__close"
            aria-label="Close details"
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="feed-geo-modal__body">
          <span className="feed-geo-modal__distance">{distKm.toFixed(1)} km from you</span>
          <p style={{ margin: "0 0 0.5rem", display: "flex", gap: "0.35rem", alignItems: "flex-start" }}>
            <User size={14} aria-hidden style={{ flexShrink: 0, marginTop: "0.15rem" }} /> {donorName}
          </p>
          {servings != null ? (
            <p style={{ margin: "0 0 0.5rem", display: "flex", gap: "0.35rem", alignItems: "flex-start" }}>
              <Package size={14} aria-hidden style={{ flexShrink: 0, marginTop: "0.15rem" }} /> {servings}{" "}
              serving{servings === 1 ? "" : "s"}
            </p>
          ) : null}
          <p style={{ margin: "0 0 0.5rem", display: "flex", gap: "0.35rem", alignItems: "flex-start" }}>
            <Phone size={14} aria-hidden style={{ flexShrink: 0, marginTop: "0.15rem" }} /> {contactDisplay}
          </p>
          <p style={{ margin: "0 0 0.5rem", display: "flex", gap: "0.35rem", alignItems: "flex-start" }}>
            <Calendar size={14} aria-hidden style={{ flexShrink: 0, marginTop: "0.15rem" }} /> Good until{" "}
            {formatDate(post.expiryDate)}
          </p>
          {emailRaw ? (
            <p style={{ margin: "0 0 0.5rem", display: "flex", gap: "0.35rem", alignItems: "flex-start" }}>
              <Mail size={14} aria-hidden style={{ flexShrink: 0, marginTop: "0.15rem" }} /> {emailRaw}
            </p>
          ) : null}
          {post.city ? <p style={{ margin: "0 0 0.5rem" }}>Area: {post.city}</p> : null}
          {notesDisplay ? <p style={{ margin: "0.65rem 0 0", color: "#57534e" }}>{notesDisplay}</p> : null}
          {(telHref || mailto) && (
            <div className="feed-geo-modal__actions">
              {telHref ? (
                <a href={telHref}>
                  Call
                </a>
              ) : null}
              {mailto ? (
                <a href={mailto}>
                  Email
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const Feed = () => {
  const navigate = useNavigate();
  const {
    coords,
    error: geoError,
    loading: geoLoading,
    consentGiven,
    requestLocation,
    recordConsent,
    permissionState,
    secureContextBlockedMessage,
  } = useGeolocation();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const [geoMode, setGeoMode] = useState(false);
  const [radius, setRadius] = useState(10);
  const [nearbyDonations, setNearbyDonations] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyDetailId, setNearbyDetailId] = useState(null);
  const modalCloseRef = useRef(null);
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

  useEffect(() => {
    if (!geoMode || !coords) return;
    const timer = setTimeout(async () => {
      setNearbyLoading(true);
      try {
        const res = await apiClient.get(`/feed/near?lat=${coords.lat}&lng=${coords.lng}&km=${radius}`);
        setNearbyDonations(res.data);
      } catch (e) {
        console.error('Nearby fetch failed', e);
      } finally {
        setNearbyLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [geoMode, coords, radius]);

  const nearbyGeoView = Boolean(geoMode && coords);

  const sortedNearbyWithDist = useMemo(() => {
    if (!coords) return [];
    return nearbyDonations
      .filter(
        (d) =>
          Array.isArray(d.displayCoordinates) &&
          d.displayCoordinates.length >= 2 &&
          typeof d.displayCoordinates[0] === "number" &&
          typeof d.displayCoordinates[1] === "number"
      )
      .map((d) => {
        const [lng, lat] = d.displayCoordinates;
        return {
          d,
          dist: haversineKm(coords.lat, coords.lng, lat, lng),
        };
      })
      .sort((a, b) => a.dist - b.dist);
  }, [nearbyDonations, coords]);

  const mapFlyPosition = useMemo(() => {
    if (!nearbyDetailId) return null;
    const entry = sortedNearbyWithDist.find((x) => donationIdEquals(x.d._id, nearbyDetailId));
    if (!entry) return null;
    const [lng, lat] = entry.d.displayCoordinates;
    return [lat, lng];
  }, [nearbyDetailId, sortedNearbyWithDist]);

  const nearbyDetailEntry = useMemo(() => {
    if (!nearbyDetailId) return null;
    return sortedNearbyWithDist.find((x) => donationIdEquals(x.d._id, nearbyDetailId)) || null;
  }, [nearbyDetailId, sortedNearbyWithDist]);

  useEffect(() => {
    if (!geoMode) setNearbyDetailId(null);
  }, [geoMode]);

  useEffect(() => {
    if (!nearbyDetailId) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setNearbyDetailId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nearbyDetailId]);

  useEffect(() => {
    if (nearbyDetailId && modalCloseRef.current) {
      modalCloseRef.current.focus();
    }
  }, [nearbyDetailId]);

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const hasPosts = posts.length > 0;
  const emptyFeed = !loading && !error && total === 0 && !debouncedQuery;
  const searchNoMatch = !loading && !error && total === 0 && debouncedQuery.length > 0;

  const handleRefresh = () => setRefreshNonce((n) => n + 1);

  return (
    <div className={`feed-page${nearbyGeoView ? " feed-page--geo-map-open" : ""}`}>
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

        {/* ── GEO MODE CONTROLS ── */}
        <div className="geo-controls">
          <button
            type="button"
            onClick={async () => {
              if (!geoMode && !consentGiven) { await recordConsent(); requestLocation(); }
              else if (!geoMode && consentGiven && !coords) { requestLocation(); }
              setGeoMode(prev => !prev);
            }}
          >
            {geoMode ? 'Show all donations' : 'Show donations near me'}
          </button>

          {geoMode && (
            <label>
              Radius: {radius} km
              <input
                type="range" min="1" max="50" value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              />
            </label>
          )}
        </div>

        {geoMode && !coords ? (
          <div role="region" aria-label="Location status" style={{ marginBottom: '1rem' }}>
            {geoLoading ? <p className="feed-panel__text">Getting your location…</p> : null}
            {!geoLoading && secureContextBlockedMessage ? (
              <p className="feed-panel__text">{secureContextBlockedMessage}</p>
            ) : null}
            {!geoLoading && permissionState === 'denied' && !geoError ? (
              <p className="feed-panel__text">
                Location is blocked for this site in your browser. Use the address bar lock → Site settings →
                Location → Allow, then toggle &ldquo;Donations near me&rdquo; off and on.
              </p>
            ) : null}
            {!geoLoading && geoError ? <p className="feed-panel__text">{geoError}</p> : null}
          </div>
        ) : null}

        {nearbyGeoView ? (
          <section className="feed-geo-stage feed-geo-stage--bleed" aria-label="Donations near your location">
            <div className="feed-geo-stage__bar">
              <span>
                <strong>Near me</strong> · radius {radius} km
              </span>
              {nearbyLoading ? <span>Updating…</span> : null}
              {!nearbyLoading ? (
                <span>
                  {sortedNearbyWithDist.length} listing{sortedNearbyWithDist.length === 1 ? "" : "s"} in range
                </span>
              ) : null}
            </div>
            <div className="feed-geo-split">
              <div className="feed-geo-map-wrap">
                <MapContainer center={[coords.lat, coords.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
                  <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapFlyTo position={mapFlyPosition} />
                  <CircleMarker
                    center={[coords.lat, coords.lng]}
                    radius={10}
                    pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.8 }}
                  />
                  {sortedNearbyWithDist.map(({ d }) => {
                    const [lng, lat] = d.displayCoordinates;
                    return (
                      <Marker
                        key={String(d._id)}
                        position={[lat, lng]}
                        eventHandlers={{
                          click: (e) => {
                            const ev = e?.originalEvent;
                            ev?.preventDefault?.();
                            setNearbyDetailId(String(d._id));
                          },
                        }}
                      />
                    );
                  })}
                </MapContainer>
              </div>
              <aside className="feed-geo-sidebar" aria-label="Nearby listings">
                <h2 className="feed-geo-sidebar__head">Nearby</h2>
                <ul className="feed-geo-sidebar__list">
                  {sortedNearbyWithDist.length === 0 && !nearbyLoading ? (
                    <li className="feed-geo-empty">Nothing in this radius yet. Try widening the distance.</li>
                  ) : null}
                  {sortedNearbyWithDist.map(({ d, dist }) => (
                    <li key={String(d._id)}>
                      <button
                        type="button"
                        className={`feed-geo-row ${donationIdEquals(d._id, nearbyDetailId) ? "feed-geo-row--selected" : ""}`}
                        onClick={() => setNearbyDetailId(String(d._id))}
                      >
                        <div className="feed-geo-row__title">{getDisplayText(d.item, "Listing")}</div>
                        <p className="feed-geo-row__meta">
                          <span className="feed-geo-row__distance">{dist.toFixed(1)} km away</span>
                          {typeof d.servings === "number"
                            ? ` · ${d.servings} serving${d.servings !== 1 ? "s" : ""}`
                            : ""}
                          {d.city?.trim() ? ` · ${d.city.trim()}` : ""}
                        </p>
                        <p className="feed-geo-row__meta">Good until {formatDate(d.expiryDate)}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          </section>
        ) : null}

        {nearbyGeoView ? (
          <p className="feed-geo-hint">
            Showing the map view. Switch to &ldquo;Show all donations&rdquo; above to browse the searchable feed with photos.
          </p>
        ) : null}

        {!nearbyGeoView && (
          <>
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
          </>
        )}
      </div>

      {nearbyDetailEntry ? (
        <NearbyDonationDetailModal
          entry={nearbyDetailEntry}
          onClose={() => setNearbyDetailId(null)}
          closeBtnRef={modalCloseRef}
        />
      ) : null}
    </div>
  );
};

export default Feed;
