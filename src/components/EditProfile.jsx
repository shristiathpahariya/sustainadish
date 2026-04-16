import React, { useState, useEffect } from "react";
import { apiClient } from "../config";
import "../../src/Profile.css";
import "../../src/Editprofile.css";
import { useNavigate } from "react-router-dom";
import { useUser } from "../UserContext";
import { useMessageDialog } from "../context/MessageDialogContext";

const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
  <div className="edit-modal-overlay" onClick={onCancel}>
    <div className="edit-modal-panel" onClick={(e) => e.stopPropagation()}>
      <div className="edit-modal-bar">
        <span>Confirm</span>
      </div>
      <p className="edit-modal-message">{message}</p>
      <div className="edit-modal-actions">
        <button type="button" onClick={onConfirm} className="edit-modal-btn edit-modal-btn--primary">
          Yes
        </button>
        <button type="button" onClick={onCancel} className="edit-btn edit-modal-btn--ghost">
          No
        </button>
      </div>
    </div>
  </div>
);

const Editprofile = () => {
  const { user, setUser } = useUser();
  const { notifySuccess, notifyError } = useMessageDialog();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [contact, setContact] = useState(user?.contact || "");
  const [location, setLocation] = useState(user?.location || "");
  const [profileImage, setProfileImage] = useState(user?.profilePicture || "/user.png");
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(user?.profilePicture || "/user.png");
  const [uploading, setUploading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return;
    try {
      const u = JSON.parse(stored);
      setFirstName(u.firstName || "");
      setLastName(u.lastName || "");
      setContact(u.contact || "");
      setLocation(u.location || "");
      setProfileImage(u.profilePicture || "/user.png");
      setImagePreview(u.profilePicture || "/user.png");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setContact(user.contact || "");
    setLocation(user.location || "");
    setProfileImage(user.profilePicture || "/user.png");
    setImagePreview(user.profilePicture || "/user.png");
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notifyError("Please choose an image file (PNG, JPG, or similar).", "Invalid file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notifyError("Images must be 5MB or smaller.", "File too large");
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleImageClick = () => {
    document.getElementById("profile-picture-input")?.click();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setModalType("update");
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setModalType("cancel");
    setIsModalOpen(true);
  };

  const confirmUpdate = async () => {
    const storedRaw = localStorage.getItem("user");
    const u = storedRaw ? JSON.parse(storedRaw) : null;
    if (!u) {
      notifyError("We couldn't find your session. Please sign in again.", "Not signed in");
      setIsModalOpen(false);
      return;
    }

    if (selectedFile) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("profilePicture", selectedFile);

        const uploadResponse = await apiClient.post(
          `/auth/upload-profile-picture/${u._id}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        if (uploadResponse.data.success) {
          setProfileImage(uploadResponse.data.user.profilePicture);
          const updatedUser = { ...u, ...uploadResponse.data.user };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setUser(updatedUser);

          const updatedData = {
            firstName: firstName || u.firstName,
            lastName: lastName || u.lastName,
            contact: contact || u.contact,
            location: location || u.location,
            profilePicture: uploadResponse.data.user.profilePicture,
          };

          const profileResponse = await apiClient.patch(
            `/auth/update-profile/${u._id}`,
            updatedData
          );

          if (profileResponse.data.success) {
            localStorage.setItem("user", JSON.stringify(profileResponse.data.user));
            setUser(profileResponse.data.user);
            notifySuccess("Your profile and photo are up to date.", "Saved");
            navigate("/profile");
          }
        }
      } catch (error) {
        console.error("Error uploading profile picture:", error);
        notifyError("We couldn't upload your photo. Try again or use a smaller image.");
      } finally {
        setUploading(false);
      }
    } else {
      const updatedData = {
        firstName: firstName || u.firstName,
        lastName: lastName || u.lastName,
        contact: contact || u.contact,
        location: location || u.location,
        profilePicture: profileImage || u.profilePicture,
      };

      try {
        const response = await apiClient.patch(`/auth/update-profile/${u._id}`, updatedData);

        if (response.data.success) {
          localStorage.setItem("user", JSON.stringify(response.data.user));
          setUser(response.data.user);
          notifySuccess("Your changes have been saved.", "Profile updated");
          navigate("/profile");
        }
      } catch (error) {
        console.error("Error updating profile:", error);
        notifyError("We couldn't save your profile. Please try again.");
      }
    }
    setIsModalOpen(false);
  };

  const confirmCancel = () => {
    navigate("/profile");
    setIsModalOpen(false);
  };

  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="profile-page-container edit-profile-page">
      <header className="edit-profile-header">
        <div className="edit-profile-hero">
          <input
            id="profile-picture-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="edit-profile-file-input"
            tabIndex={-1}
          />
          <button
            type="button"
            className="edit-profile-photo-wrap"
            onClick={handleImageClick}
            aria-label="Change profile picture"
          >
            <div className="profile-picture-container">
              <img
                src={imagePreview}
                alt=""
                className="profile-picture"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/user.png";
                }}
              />
            </div>
            <span className="edit-profile-photo-label">Change photo</span>
          </button>

          <div className="profile-details">
            <div className="profile-name-line">
              <span className="profile-name">Edit profile</span>
            </div>
            <p className="edit-profile-lede">
              Update how you appear and how others can reach you.
            </p>
            <div className="profile-meta-row edit-profile-meta">
              <span>
                <strong>{[firstName, lastName].filter(Boolean).join(" ") || "Your name"}</strong>
              </span>
            </div>
          </div>

          <div className="profile-buttons">
            <button type="button" className="edit-btn" onClick={() => navigate("/profile")}>
              Back
            </button>
          </div>
        </div>
      </header>

      <div className="separator-editorial">
        <div className="separator-inner">
          <div className="sep-line" />
          <div className="sep-diamond" />
          <span className="sep-label">Your details</span>
          <div className="sep-diamond" />
          <div className="sep-line" />
        </div>
      </div>

      <section className="edit-profile-body">
        <form className="edit-profile-form" onSubmit={handleSubmit} noValidate>
          <div className="edit-form-grid">
            <div className="edit-field">
              <label htmlFor="edit-first-name">First name</label>
              <input
                id="edit-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div className="edit-field">
              <label htmlFor="edit-last-name">Last name</label>
              <input
                id="edit-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </div>
            <div className="edit-field">
              <label htmlFor="edit-contact">Contact</label>
              <input
                id="edit-contact"
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div className="edit-field">
              <label htmlFor="edit-location">Location</label>
              <input
                id="edit-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                autoComplete="address-level2"
              />
            </div>
          </div>

          {uploading && (
            <p className="edit-upload-status" role="status">
              Uploading profile picture…
            </p>
          )}

          <div className="edit-form-actions">
            <button
              type="button"
              className="edit-btn"
              onClick={handleCancel}
              disabled={uploading}
            >
              Cancel
            </button>
            <button type="submit" className="edit-profile-save" disabled={uploading}>
              {uploading ? "Uploading…" : "Save changes"}
            </button>
          </div>
        </form>
      </section>

      {isModalOpen && (
        <ConfirmationModal
          message={
            modalType === "update"
              ? "Save changes to your profile?"
              : "Leave without saving?"
          }
          onConfirm={modalType === "update" ? confirmUpdate : confirmCancel}
          onCancel={closeModal}
        />
      )}
    </div>
  );
};

export default Editprofile;
