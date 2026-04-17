import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../config";
import "../feedback.css";
import { useMessageDialog } from "../context/MessageDialogContext";

const MIN_CHARS = 10;

const Feedback = () => {
  const { notifySuccess, notifyError, notifyInfo } = useMessageDialog();
  const [rating, setRating] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating == null) {
      notifyInfo("Please select a star rating before submitting.", "Rating required");
      return;
    }
    const text = feedback.trim();
    if (text.length < MIN_CHARS) {
      notifyInfo(
        `Please write at least ${MIN_CHARS} characters of feedback.`,
        "Feedback required"
      );
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/feedback", { rating, feedback: text });
      setRating(null);
      setFeedback("");
      notifySuccess("Your feedback helps us improve SustainaDish.", "Thank you");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Could not submit feedback. Please try again.";
      notifyError(typeof msg === "string" ? msg : "Could not submit feedback.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="feedback-page" aria-label="Feedback">
      <div className="feedback-page__inner">
        <header className="feedback-page__header">
          <p className="feedback-page__eyebrow">We&apos;d love to hear from you</p>
          <h1 className="feedback-page__title">Feedback</h1>
          <p className="feedback-page__lede">
            Rate your experience and tell us what we can do better.
          </p>
        </header>

        <form className="feedback-page__card" onSubmit={handleSubmit} noValidate>
          <button
            type="button"
            className="feedback-page__close"
            onClick={() => navigate("/")}
            aria-label="Close and go home"
          >
            ×
          </button>

          <label className="feedback-page__label" htmlFor="feedback-rating">
            Overall rating
          </label>
          <div id="feedback-rating" className="feedback-page__stars" role="group" aria-label="Star rating">
            <span className="feedback-page__sr-only" aria-live="polite">
              {rating != null ? `${rating} out of 5 stars selected` : "No rating selected"}
            </span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`feedback-page__star${rating != null && star <= rating ? " is-on" : ""}`}
                onClick={() => setRating(star)}
                aria-label={`Rate ${star} out of 5`}
              >
                &#9733;
              </button>
            ))}
          </div>

          <label className="feedback-page__label" htmlFor="feedback-text">
            Your comments
          </label>
          <textarea
            id="feedback-text"
            className="feedback-page__textarea"
            placeholder="What worked well? What could be improved?"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={6}
            maxLength={2000}
            autoComplete="off"
          />
          <p className="feedback-page__hint">
            {feedback.trim().length < MIN_CHARS
              ? `${MIN_CHARS - feedback.trim().length} more characters needed (minimum ${MIN_CHARS})`
              : `${feedback.trim().length} characters`}
          </p>

          <div className="feedback-page__actions">
            <button type="submit" className="feedback-page__submit" disabled={loading}>
              {loading ? "Sending…" : "Submit feedback"}
            </button>
          </div>
        </form>

        <Link to="/" className="feedback-page__home">
          Back to home
        </Link>
      </div>
    </main>
  );
};

export default Feedback;
