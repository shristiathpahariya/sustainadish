import React from "react";
import Contactform from "./Contactform";
import Contactinfo from "./Contactinfo";
import "../contactus.css";

const Fullcontact = () => {
  return (
    <section className="contact-page" aria-label="Contact SustainaDish">
      <div className="contact-page__inner">
        <div className="contact-page__grid">
          <aside className="contact-sidebar">
            <Contactinfo />
          </aside>
          <div className="contact-main">
            <Contactform />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Fullcontact;
