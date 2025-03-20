import React from 'react';
import Location from "/location.png"
import Email from "/email.png"
import insta from "/insta logo.png"

const Contactinfo = () => {
  return (
    <div className="contact-info">
      <div className="info-header">
        <h2>Contact Information</h2>
      </div>
      <div className="info-item">
        <a href="https://www.google.com/maps/search/Dhobidhara,+Kathmandu" target="_blank" rel="noopener noreferrer">
          <img src={Location} alt="Location Icon" className="info-item-img" />
          <p>Dhobidhara, Kathmandu</p>
        </a>
      </div>
      <div className="info-item">
        <a href="mailto:sustainadish@gmail.com">
          <img src={Email} alt="Email Icon" className="info-item-img" />
          <p>sustainadish@gmail.com</p>
        </a>
      </div>
      <div className="info-item">
        <a href="https://www.instagram.com/sustainadish/">
          <img src={insta} alt="Instagram Icon" className="info-item-img"  target="_blank"/>
          <p>sustainadish</p>
        </a>
      </div>
    </div>
  );
};

export default Contactinfo;