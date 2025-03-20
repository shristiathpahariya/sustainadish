import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "/susss.png"; // Assuming this is your logo path
import '../.././src/Nav.css'; // Assuming this is your CSS
import defaultProfilePic from "../../public/user.png";

export default function Navbar() {
    const [user, setUser] = useState(null); // Track user state
    const navigate = useNavigate();

    useEffect(() => {
        const loggedInUser = localStorage.getItem("user");
        if (loggedInUser) {
            const parsedUser = JSON.parse(loggedInUser);
            console.log("User data:", parsedUser); // Check if profilePicture is there
            setUser(parsedUser);
        }  
    }, []);

    const handleClickHome = () => {
        navigate('/');
    };

    const handleClickAboutUs = () => {
        navigate('/aboutus');
    };

    const handleClickContactUs = () => {
        navigate('/contactUs');
    };

    const handleProfileClick = () => {
        navigate('/profile');
    };

    const handleDonateClick = () => {
        const user = localStorage.getItem("user"); // Check for user data in localStorage
        if (!user) {
          // If user is not logged in, redirect to login page
          alert("Please login to access this page.");
          navigate("/login");
        } else {
          // If user is logged in, navigate to donation form
          navigate('/donationform');
        }
    };

    return (
        <nav className="navbar">
            <img src={logo} className="logo" alt="Sustainadish Logo" />
            <button className="nav--title" onClick={handleClickHome}>Home</button>
            <button className="nav--title" onClick={handleClickAboutUs}>About Us</button>
            <button className="nav--title" onClick={handleDonateClick}>Donate</button>
            <button className="nav--title" onClick={handleClickContactUs}>Contact Us</button>
            {user ? (
                <div className="user-profile" onClick={handleProfileClick}>
                    {/* If the user logged in via Google, show name */}
                    {user.googleLogin ? (
                        <div className="user-profile" onClick={handleProfileClick}>
                            <img 
                                src={user.profilePicture || defaultProfilePic} 
                                alt="User Profile" 
                                className="profile-picture" 
                            />
                            <span className="user-name">
                                {user.name || `${user.firstName} ${user.lastName}`}
                            </span>
                        </div>
                    ) : (
                        // If the user logged in via traditional method, show default profile picture
                        <div className="user-profile" onClick={handleProfileClick}>
                            <img 
                                src={user.profilePicture || defaultProfilePic} 
                                alt="User Profile" 
                                className="user-profile-img" 
                            />
                            <span className="user-name">
                                {user.name || `${user.firstName} ${user.lastName}`}
                            </span>
                        </div>
                    )}
                </div>
            ) : null }
        </nav>
    );
}