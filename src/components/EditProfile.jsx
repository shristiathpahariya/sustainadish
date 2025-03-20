import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../src/Editprofile.css';
import { useNavigate } from "react-router-dom";
import { useUser } from '../UserContext';
import { gapi } from "gapi-script";

// Modal Component
const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
  <div className="modal-overlay">
    <div className="modal-content">
      <h3 className="sure-model">{message}</h3>
      <div className="modal-buttons">
        <button onClick={onConfirm} className="modal-confirm">Yes</button>
        <button onClick={onCancel} className="modal-cancel">No</button>
      </div>
    </div>
  </div>
);

const Editprofile = () => {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [contact, setContact] = useState(user.contact || '');
  const [location, setLocation] = useState(user.location || '');
  const [profileImage, setProfileImage] = useState(user.profilePicture || '/profile.png');
  
  const [isModalOpen, setIsModalOpen] = useState(false);  // Modal visibility state
  const [modalType, setModalType] = useState('');  // Type of modal (update or cancel)

  // Load current user data for editing
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setContact(user.contact || '');
      setLocation(user.location || '');
      setProfileImage(user.profilePicture || '/profile.png');
    }
  }, []);


  // Handle profile update submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalType('update');  // Set modal type to 'update' before opening
    setIsModalOpen(true);  // Open the modal
  };

  // Handle Cancel button
  const handleCancel = () => {
    setModalType('cancel');  // Set modal type to 'cancel' before opening
    setIsModalOpen(true);  // Open the modal
  };

  // Confirm Update Action
  const confirmUpdate = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      alert("User not found. Please log in again.");
      return;
    }
  
    // Merge existing values with updated fields
    const updatedData = {
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      contact: contact || user.contact,
      location: location || user.location,
      profilePicture: profileImage || user.profilePicture,
    };
  
    try {
      const response = await axios.patch(
        `http://localhost:3000/api/auth/update-profile/${user._id}`,
        updatedData
      );
  
      if (response.data.success) {
        localStorage.setItem("user", JSON.stringify(response.data.user)); // Update local storage
        setUser(response.data.user); // Update user context
        alert("Profile updated successfully!");
        navigate("/profile"); // Navigate to the profile page
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("An error occurred while updating the profile.");
    }
    setIsModalOpen(false); // Close the modal
  };
  

  // Confirm Cancel Action
  const confirmCancel = () => {
    navigate('/profile');  // Navigate back to profile page if user confirms
    setIsModalOpen(false);  // Close the modal
  };

  // Close Modal
  const closeModal = () => {
    setIsModalOpen(false);
  };

    // Ensure gapi is loaded and initialized
    useEffect(() => {
      function initGoogleAPI() {
        gapi.load('client:auth2', () => {
          gapi.auth2.init({
            client_id: "196811482048-2q1m1kpubrhedvukdc4odeetg88jgnco.apps.googleusercontent.com",
          });
        });
      }
      initGoogleAPI();
    }, []);

  
    const handleLogout = () => {
      const auth2 = gapi.auth2.getAuthInstance();
  
      if (auth2 != null) {
        console.log("Google Auth2 initialized:", auth2);
        auth2.signOut().then(() => {
          console.log("User signed out from Google.");
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          alert('You have been logged out successfully.');
        }).catch((error) => {
          console.error("Error signing out from Google:", error);
        });
      } else {
        console.error("Google Auth2 is not initialized.");
      }
    };

  return (
    <div className="edit-profile-container">
      <div className="edit-container">
        <img src="/Vector.png" className="vectorimg" alt="Background Vector" />
        <div className="profile-box">
          <form className="edit-profile-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input 
                  type="text" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input 
                  type="text" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Contact</label>
                <input 
                  type="text" 
                  value={contact} 
                  onChange={(e) => setContact(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input 
                  type="text" 
                  value={location} 
                  onChange={(e) => setLocation(e.target.value)} 
                />
              </div>
            </div>
            <div className="form-buttons">
              <button type="button" className="cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
              <button type="submit" className="update-btn">
                Update
              </button>
            </div>
          </form>
        </div>
        <p className='logout-btn' onClick={handleLogout}>Logout <img src="/logoutimg.png" alt="logout" className='logout'/></p>
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <ConfirmationModal
          message={modalType === 'update' ? 'Are you sure you want to update ?' : 'Are you sure you want to cancel ?'}
          onConfirm={modalType === 'update' ? confirmUpdate : confirmCancel}
          onCancel={closeModal}
        />
      )}
    </div>
  );
};
export default Editprofile;