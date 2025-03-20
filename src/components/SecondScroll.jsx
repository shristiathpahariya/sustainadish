import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { gapi } from "gapi-script";
import '../.././src/secondscroll.css';

export default function SecondScroll() {
  const navigate = useNavigate();

  const handleClickReceipe = () => {
    navigate('/recommend');
};


  return (
    <div>
      <section className="scroll">
        <div className="content">
          <h1 className='message'>
            Transform Ingredients into Delicious Meals – Discover Exciting Recipes for Your Leftover Ingredients
          </h1>
          <button className="get-started" onClick={handleClickReceipe}>Discover</button>
        </div>
        <img src="/secondscroll.png" alt="Fruits and Vegetables" className="ellipse secondscroll" />
        <img src="/secondpageeclipse1.png" alt="ellipse shape" className="ellipse ellipsesecond" />
      </section>
    </div>
  );
}
