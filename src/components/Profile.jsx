import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../.././src/Profile.css";
import { useUser } from "../UserContext";
import "../.././src/post.css";

const Profile = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    name: "",
    location: "",
    email: "",
    profilePicture: "/user.png",
  });
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null); // State for popup

  useEffect(() => {
    const updateUserData = () => {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user) {
        setUserData({
          name: user.name || `${user.firstName} ${user.lastName}`,
          location: user.location || "N/A",
          email: user.email || "N/A",
          profilePicture: "/user.png",
        });
      }
    };

    updateUserData();

    window.addEventListener("storage", updateUserData);

    return () => {
      window.removeEventListener("storage", updateUserData);
    };
  }, []);

  useEffect(() => {
    const fetchUserDonations = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const userEmail = user?.email;

        if (!userEmail) {
          console.error("User email not found.");
          return;
        }

        const response = await fetch(
          `http://localhost:3000/api/user/donations?email=${userEmail}`
        );

        if (!response.ok) {
          throw new Error(`Error fetching donations: ${response.statusText}`);
        }

        const donations = await response.json();
        console.log("User donations:", donations);
        setPosts(donations);
      } catch (error) {
        console.error("Error fetching donations:", error);
      }
    };

    fetchUserDonations();
  }, []);

  const handleEdit = () => {
    navigate("/editprofile");
  };

  const handlePostClick = (post) => {
    setSelectedPost(post); // Open popup
  };

  const closePopup = () => {
    setSelectedPost(null); // Close popup
  };

  return (
    <>
      <div className="profile-info">
        <img
          src={userData.profilePicture}
          alt="Profile"
          className="profile-picture"
        />
        <div className="profile-details">
          <p>{userData.name}</p>
          <p>{userData.location}</p>
          <p>{posts.length} posts</p>
          <div className="profile-buttons">
            <button onClick={handleEdit} className="edit-btn">
              Edit Profile
            </button>
          </div>
        </div>
      </div>
      <hr className="separator" />
      <div className="posts-container">
        <p className="postshead">POSTS</p>
        {posts.map((post) => (
          <div
            key={post._id}
            className="post-card"
            onClick={() => handlePostClick(post)} // Handle click
          >
            <img
              src={`http://localhost:3000/api/donations/${post._id}/image`}
              alt={post.item}
              className="post-image"
            />
          </div>
        ))}
      </div>
      {selectedPost && ( // Popup
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={`http://localhost:3000/api/donations/${selectedPost._id}/image`}
              alt={selectedPost.item}
              className="popup-image"
            />
            <div className="popup-details">
              <p>
                <strong style={{color:"darkgreen"}}>Item:</strong> {selectedPost.item}
              </p>
              <p>
                <strong style={{color:"darkgreen"}}>Donated By:</strong>{" "}
                {selectedPost.anonymous ? "Anonymous" : selectedPost.donatedBy}
              </p>
              <p>
                <strong style={{color:"darkgreen"}}>Contact:</strong> {selectedPost.contact}
              </p>
              <p>
                <strong style={{color:"darkgreen"}}>Expiry Date:</strong>{" "}
                {new Date(selectedPost.expiryDate).toLocaleDateString()}
              </p>
              <p>
                <strong style={{color:"darkgreen"}}>Additional Info:</strong> {selectedPost.additionalInfo}
              </p>

            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Profile;
