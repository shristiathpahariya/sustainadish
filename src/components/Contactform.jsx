import React, { useState } from 'react';
import Popup from './Popup'; // Make sure this path is correct
import '../.././src/contactus.css';
import { useNavigate } from 'react-router-dom';

const Contactform = () => {
  const [isPopupVisible, setPopupVisible] = useState(false); // Popup visibility state
  const [isTermsChecked, setTermsChecked] = useState(false); // Checkbox state
  const navigate = useNavigate();

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if the user agreed to the terms
    if (!isTermsChecked) {
      alert("Please agree to the terms and conditions.");
      return;
    }

    // Collect form data
    const formData = {
      firstName: e.target.firstName.value,
      lastName: e.target.lastName.value,
      email: e.target.email.value,
      contact: e.target.contact.value,
      location: e.target.location.value,
      message: e.target.message.value,
    };

    try {
      // Send data to the server
      const response = await fetch('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      // Check if the submission was successful
      if (response.ok) {
        setPopupVisible(true); // Show the Popup on successful submission
        e.target.reset(); // Reset the form fields
      } else {
        alert('Failed to send message');
      }
    } catch (error) {
      console.error('Error submitting the form:', error);
      alert('Error sending message');
    }
  };

  // Function to close the Popup
  const closePopup = () => {
    setPopupVisible(false); // Close the popup
    document.getElementById('contactForm').reset(); // Reset the form fields
    setTermsChecked(false); // Reset the terms checkbox state
  };
  

  // Function to navigate to the home page when the close button is clicked
  const handleCloseForm = () => {
    navigate('/');
  };

  return (
    <div className="contact-form">
    <div onClick={handleCloseForm} className="contact-close-button">×</div>

      <h2 className='lovetohelp'>We'd love to help</h2>
      <h4 className='reachtohelp'>Reach out and we’ll get in touch within 24 hours.</h4>


      <form id="contactForm" onSubmit={handleSubmit}>
        <div className="name-fields">
          <input type="text" name="firstName" placeholder="First Name" required />
          <input type="text" name="lastName" placeholder="Last Name" required />
        </div>
        <input type="email" name="email" placeholder="Email Address" required />
        <div className="contact-fields">
          <input type="text" name="contact" placeholder="Contact" required />
          <input type="text" name="location" placeholder="Location" required />
        </div>
        <textarea name="message" placeholder="Type your message here" required></textarea>

        {/* Checkbox for agreeing to terms */}
        <div className="terms-container">
          <input 
            type="checkbox" 
            id="terms-checkbox" 
            name="terms" 
            onChange={(e) => setTermsChecked(e.target.checked)} // Update state when checked
          />
          <label htmlFor="terms-checkbox"> I've agreed to SustainaDish terms and conditions</label>
        </div>

        <div className="button-container">
          <button type="submit">Send Message</button>
        </div>
      </form>

      {/* Show Popup based on the state */}
      {isPopupVisible && (
        <Popup 
          isOpen={isPopupVisible} 
          onRequestClose={closePopup} 
          className="popup-content" 
          overlayClassName="popup-overlay"
        >
          <p>Thank you for reaching out! We'll get back to you soon.</p>
        </Popup>
      )}
    </div>
  );
};

export default Contactform;