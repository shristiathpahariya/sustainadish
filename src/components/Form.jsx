import React, { useState, useEffect, useMemo, useRef } from "react";
import { useUser } from "../UserContext";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../config";
import { useMessageDialog } from "../context/MessageDialogContext";
import "../form.css";

/** Matches Backend/routes/donationRoutes.js multer limit */
const DONATION_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

function isHeicHeif(file) {
  const t = (file.type || "").toLowerCase();
  if (t && /image\/(heic|heif)/i.test(t)) return true;
  const n = (file.name || "").toLowerCase();
  return n.endsWith(".heic") || n.endsWith(".heif");
}

function buildFormData(data, file) {
  const fd = new FormData();
  fd.append("donatedBy", data.donatedBy);
  fd.append("contact", data.contact);
  fd.append("email", data.email);
  fd.append("item", data.item);
  fd.append("servings", String(data.servings));
  fd.append("expiryDate", data.expiryDate);
  if (data.additionalInfo) {
    fd.append("additionalInfo", data.additionalInfo);
  }
  if (file instanceof File) {
    fd.append("pictures", file);
  }
  return fd;
}

function validateContact(contact) {
  const t = String(contact || "").trim();
  if (t.length < 3) {
    return "Enter a phone number, email, or other contact — at least 3 characters.";
  }
  if (t.length > 200) {
    return "Contact must be 200 characters or fewer.";
  }
  if (/[<>]/.test(t)) {
    return "Contact cannot contain < or >.";
  }
  return "";
}

function extractApiError(err) {
  const d = err.response?.data;
  if (!d) return err.message || "Something went wrong.";
  if (typeof d.message === "string") return d.message;
  if (typeof d.error === "string") return d.error;
  return "Something went wrong.";
}

const Form = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { notifySuccess, notifyError } = useMessageDialog();

  const [formData, setFormData] = useState({
    donatedBy: "",
    contact: "",
    email: "",
    item: "",
    servings: "",
    expiryDate: "",
    additionalInfo: "",
  });
  const [pictures, setPictures] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const navigateTimerRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const minExpiryDate = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t.toISOString().split("T")[0];
  }, []);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        donatedBy: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        contact: user.contact || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (navigateTimerRef.current) {
        clearTimeout(navigateTimerRef.current);
        navigateTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "contact") {
      const msg = validateContact(value);
      setErrors((prev) => ({ ...prev, contact: msg || undefined }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPictures(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    if (isHeicHeif(file)) {
      notifyError(
        "HEIC/HEIF photos do not show in most browsers. Please choose JPEG or PNG (on iPhone: Settings → Camera → Formats → Most Compatible, or export in Photos).",
        "Unsupported format"
      );
      e.target.value = "";
      setPictures(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    if (!file.type.startsWith("image/") && file.type !== "") {
      notifyError("Please choose an image file (PNG, JPG, or similar).", "Invalid file");
      e.target.value = "";
      setPictures(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    if (file.size > DONATION_IMAGE_MAX_BYTES) {
      notifyError("Images must be 10MB or smaller.", "File too large");
      e.target.value = "";
      setPictures(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setPictures(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const contactErr = validateContact(formData.contact);
    if (contactErr) {
      setErrors((prev) => ({ ...prev, contact: contactErr }));
      notifyError(contactErr, "Check contact");
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = buildFormData(formData, pictures);
      const response = await apiClient.post("/messageForm", formDataToSend);

      const msg =
        typeof response.data?.message === "string"
          ? response.data.message
          : "Thank you for submitting the donation!";
      notifySuccess(msg, "Donation posted");

      setFormData({
        donatedBy: user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "",
        contact: user?.contact || "",
        email: user?.email || "",
        item: "",
        servings: "",
        expiryDate: "",
        additionalInfo: "",
      });
      setPictures(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      const fileInput = document.getElementById("donation-pictures");
      if (fileInput) fileInput.value = "";

      navigateTimerRef.current = setTimeout(() => {
        navigateTimerRef.current = null;
        navigate("/profile");
      }, 2000);
    } catch (error) {
      console.error("Donation submit error:", error);
      notifyError(extractApiError(error), "Could not submit");
    } finally {
      setLoading(false);
    }
  };

  const contactInvalid = Boolean(errors.contact);

  return (
    <div className="donation-page">
      <div className="donation-page__inner">
        <header className="donation-page__header">
          <img
            src="/susss.png"
            alt=""
            className="donation-page__logo"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <h1 className="donation-page__title">Food donation</h1>
          <p className="donation-page__lede">
            List what you can share so neighbours can find it on the community feed.
          </p>
        </header>

        <section className="donation-page__card">
          <form className="donation-form" onSubmit={handleSubmit} noValidate>
            <p className="donation-page__note">Fields marked * are required.</p>

            <h2 className="donation-form__section">Donor</h2>

            <div className="donation-form__field">
              <label htmlFor="donation-donated-by">
                Donated by <span className="donation-form__req">*</span>
              </label>
              <input
                id="donation-donated-by"
                name="donatedBy"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={formData.donatedBy}
                onChange={handleChange}
                required
              />
            </div>

            <div className="donation-form__field">
              <label htmlFor="donation-contact">
                Contact <span className="donation-form__req">*</span>
              </label>
              <input
                id="donation-contact"
                name="contact"
                type="text"
                autoComplete="tel"
                placeholder="Phone, email, or @handle"
                value={formData.contact}
                onChange={handleChange}
                required
              />
              {errors.contact && <p className="donation-form__error">{errors.contact}</p>}
            </div>

            <div className="donation-form__field">
              <label htmlFor="donation-email">
                Email <span className="donation-form__req">*</span>
              </label>
              <input
                id="donation-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <h2 className="donation-form__section">Item</h2>

            <div className="donation-form__field">
              <label htmlFor="donation-item">
                What you&apos;re donating <span className="donation-form__req">*</span>
              </label>
              <input
                id="donation-item"
                name="item"
                type="text"
                placeholder="e.g. Vegetable soup, 2 loaves"
                value={formData.item}
                onChange={handleChange}
                required
              />
            </div>

            <div className="donation-form__row">
              <div className="donation-form__field">
                <label htmlFor="donation-servings">
                  Servings <span className="donation-form__req">*</span>
                </label>
                <input
                  id="donation-servings"
                  name="servings"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="e.g. 4"
                  value={formData.servings}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="donation-form__field">
                <label htmlFor="donation-expiry-date">
                  Use-by / expiry <span className="donation-form__req">*</span>
                </label>
                <input
                  id="donation-expiry-date"
                  name="expiryDate"
                  type="date"
                  min={minExpiryDate}
                  value={formData.expiryDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="donation-form__field">
              <label htmlFor="donation-pictures">Photo (optional)</label>
              <input
                id="donation-pictures"
                name="pictures"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.webp,.gif"
                onChange={handleFileChange}
                className="donation-form__file"
              />
              <p className="donation-form__hint">
                JPEG, PNG, GIF, or WebP, up to 10MB. (HEIC/iPhone “High Efficiency” will not display on
                the web — use Most Compatible or export as JPEG.)
              </p>
              {previewUrl && pictures && (
                <div className="donation-form__preview">
                  <img src={previewUrl} alt="" />
                  <span className="donation-form__preview-label">Preview — how it will look in the feed</span>
                </div>
              )}
            </div>

            <div className="donation-form__field">
              <label htmlFor="donation-additional-info">Description (optional)</label>
              <textarea
                id="donation-additional-info"
                name="additionalInfo"
                maxLength={500}
                rows={5}
                placeholder="Ingredients, allergens, pickup notes…"
                value={formData.additionalInfo}
                onChange={handleChange}
              />
              <p className="donation-form__hint">{formData.additionalInfo.length}/500</p>
            </div>

            <div className="donation-form__actions">
              <button
                type="button"
                className="donation-form__btn donation-form__btn--ghost"
                onClick={() => navigate(-1)}
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                className="donation-form__btn donation-form__btn--primary"
                disabled={loading || contactInvalid}
              >
                {loading ? "Submitting…" : "Post donation"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Form;
