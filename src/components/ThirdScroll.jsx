import React from "react";
import { useNavigate } from "react-router-dom";
import '../.././src/thirdscroll.css'

export default function ThirdScroll(){
  const navigate = useNavigate()

  const handleClick = () => {
    const user = localStorage.getItem("user"); // Check for user data in localStorage
    if (!user) {
      // If user is not logged in, redirect to login page
      alert("Please login to access this page.");
      navigate("/login");
    } else {
      // If user is logged in, navigate to the recommendation page
      navigate('/feed');
    }
  };

  const handleClickFeed = () => {
    navigate('/feed');
};

    return(
        <section className="scrollthird">
      <div className="content">
        <h1 className='message'>
        “Donate Now and Make a Lasting 
Difference in the Lives of 
Those in Need"

        </h1>
        <button className="get-started" onClick={handleClick}>Donate</button>
      </div>

   
        <img src="/bagguate.png" alt="Fruits and Vegetables" className="ellipse thirdscroll" />
 

        {/* Ellipse Images */}
        <img src="/Ellipsethird.png" alt="ellipse shape" className="ellipse ellipsethird" />
    </section>
  );
    
}