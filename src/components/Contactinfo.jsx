import React from "react";
import Location from "/location.png";
import Email from "/email.png";
import insta from "/insta logo.png";

const Contactinfo = () => {
  return (
    <div className="contact-sidebar__content">
      <header className="contact-sidebar__header">
        <h2 className="contact-sidebar__title">Contact information</h2>
        <p className="contact-sidebar__lede">We&apos;re here to help.</p>
      </header>
      <ul className="contact-sidebar__list">
        <li className="contact-sidebar__item">
          <a
            href="https://www.google.com/maps/search/Dhobidhara,+Kathmandu"
            target="_blank"
            rel="noopener noreferrer"
            className="contact-sidebar__link"
          >
            <img src={Location} alt="" className="contact-sidebar__icon" width={28} height={28} />
            <span>Dhobidhara, Kathmandu</span>
          </a>
        </li>
        <li className="contact-sidebar__item">
          <a href="mailto:sustainadish@gmail.com" className="contact-sidebar__link">
            <img src={Email} alt="" className="contact-sidebar__icon" width={28} height={28} />
            <span>sustainadish@gmail.com</span>
          </a>
        </li>
        <li className="contact-sidebar__item">
          <a
            href="https://www.instagram.com/sustainadish/"
            target="_blank"
            rel="noopener noreferrer"
            className="contact-sidebar__link"
          >
            <img src={insta} alt="" className="contact-sidebar__icon" width={28} height={28} />
            <span>@sustainadish</span>
          </a>
        </li>
      </ul>
    </div>
  );
};

export default Contactinfo;
