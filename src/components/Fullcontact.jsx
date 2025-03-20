// src/App.js
import React from 'react';
import Contactform from './ContactForm';
import Contactinfo from './ContactInfo';
import Popup from './Popup';


const Fullcontact = () => {
  const closeContact = () => {
    document.querySelector('.container').style.display = 'none';
  };

  return (
    <div className="container">
      <Contactinfo />
      <Popup className="close-btn" onClick={closeContact}>
        &times;
      </Popup>
      <Contactform />
    </div>
  );
};

export default Fullcontact;
