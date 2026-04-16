import React from "react";
import FirstScroll from "./FirstScroll";
import ThirdScroll from "./ThirdScroll";
import "../landing.css";

function Landing() {
  return (
    <main className="landing-page">
      <FirstScroll />
      <ThirdScroll />
    </main>
  );
}

export default Landing;
