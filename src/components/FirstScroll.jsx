import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import '../.././src/App.css';
import SecondScroll from './SecondScroll';

function FirstScroll() {
  const navigate = useNavigate();
  const secondScrollRef = useRef(null); // Ref for the SecondScroll component
  const [isLoggedIn, setIsLoggedIn] = useState(false); // State to track login status

  useEffect(() => {
    // Check login status from localStorage
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleLoginSignup = () => {
    navigate('/login');
  };

  const handleScrollToSecondPage = () => {
    if (secondScrollRef.current) {
      secondScrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <section className="landing">
        <div className="content">
          <h1 className='message'>
            Discover tasty recipes and give back to your community – welcome to
            SuistanaDish, where delicious meets generous!
          </h1>
          <button
            className="get-started"
            onClick={isLoggedIn ? handleScrollToSecondPage : handleLoginSignup}
          >
            {isLoggedIn ? 'Explore More' : 'Get Started'}
          </button>
        </div>
        <img src="/landing.png" alt="Fruits and Vegetables" className="eclipse image" />
        <img src="/Ellipse 28.png" alt="ellipse shape" className="ellipse ellipse1" />
        <img src="/Ellipse 29.png" alt="ellipse shape" className="ellipse ellipse2" />
        <img src="/Ellipse 30.png" alt="ellipse shape" className="ellipse ellipse3" />
        <img src="/Ellipse 31.png" alt="ellipse shape" className="ellipse ellipse4" />
      </section>

      {/* Render SecondScroll component */}
      <div ref={secondScrollRef}>
        <SecondScroll />
      </div>
    </>
  );
}

export default FirstScroll;
