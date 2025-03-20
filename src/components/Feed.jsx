import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../UserContext";
import "../.././src/feed.css";

const Feed = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  

  const [posts, setPosts] = useState([]); // Store donation posts
  const [loading, setLoading] = useState(true); // Loading state


   // Fetch donation posts
   useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/feed"); // Endpoint to fetch donations
        if (response.ok) {
          const data = await response.json();
           // Sort posts by createdAt in descending order (latest first)
        const sortedPosts = data.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
          setPosts(data);
        } else {
          console.error("Error fetching posts:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false); // Stop loading once data is fetched
      }
    };

    fetchPosts();
  }, []);


  return (
    <>
       {loading ? (
        <div class="loader"></div>
      ) : (
        <div className="feed-container">
          {posts.map((post) => (
            <div key={post._id} className="feed-card">
              <img
                src={`http://localhost:3000/api/donations/${post._id}/image`} // Fetch the image
                alt={post.item}
                className="feed-image"
              />
              <div className="feed-details">
                <p><strong>Item:</strong> {post.item}</p>
                <p><strong>Donated By:</strong> {post.anonymous ? "Anonymous" : post.donatedBy}</p>
                <p><strong>Contact:</strong> {post.contact}</p>
                <p><strong>Expiry Date:</strong> {new Date(post.expiryDate).toLocaleDateString()}</p>
                <p><strong>Additional Info:</strong> {post.additionalInfo}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default Feed;
