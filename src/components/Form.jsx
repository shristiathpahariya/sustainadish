import React, { useState, useEffect } from 'react';
import { useUser } from '../UserContext';
import { useNavigate } from "react-router-dom";
import { apiUrl } from '../config';
import '../.././src/form.css';

const Form = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [formData, setFormData] = useState({
    donatedBy: '',
    contact: '',
    email: '',
    item: '',
    servings: '',
    expiryDate: '',
    pictures: null,
    additionalInfo: ''
  });

  const [errors, setErrors] = useState({});
  const [submissionStatus, setSubmissionStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData((prevData) => ({
        ...prevData,
        donatedBy: user.name || `${user.firstName} ${user.lastName}`,
        contact: user.contact || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  const validateContact = (contact) => {
    const contactRegex = /^[a-zA-Z0-9\s]*$/; // Allows letters, numbers, and spaces
    if (!contactRegex.test(contact)) {
      return 'Contact must only contain letters, numbers, and spaces.';
    }
    return '';
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });

    if (name === 'contact') {
      const errorMessage = validateContact(value);
      setErrors((prevErrors) => ({
        ...prevErrors,
        contact: errorMessage
      }));
    }
  };

  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      pictures: e.target.files[0]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errorMessage = validateContact(formData.contact);
    if (errorMessage) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        contact: errorMessage
      }));
      return;
    }

    setLoading(true);
    const formDataToSend = new FormData();
    for (const key in formData) {
      formDataToSend.append(key, formData[key]);
    }

    try {
      const response = await fetch(`${apiUrl}/messageForm`, {
        method: 'POST',
        body: formDataToSend
      });

      if (response.ok) {
        setSubmissionStatus('Thank you for submitting the donation!');
        navigate('/profile');
      } else {
        const errorData = await response.json();
        setSubmissionStatus(`Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setSubmissionStatus('An error occurred while submitting the donation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="donation-container">
      <div className="donation-form-header">
        <img src="susss.png" alt="Sustainadish Logo" className="donation-logo" />
        <h1>Food Donation Form</h1>
      </div>
      <div className="donation-form-container">
        <form className="donation-form" onSubmit={handleSubmit} encType="multipart/form-data">
          <p className="thankyou-message">Thank you for your gift!</p>

          <legend className="donor-info">DONOR INFORMATION</legend>
          <label htmlFor="donation-donated-by">Donated By</label>
          <input
            placeholder="Enter your full name"
            type="text"
            id="donation-donated-by"
            name="donatedBy"
            value={formData.donatedBy}
            onChange={handleChange}
            required
          />
          <label htmlFor="donation-contact">Contact</label>
          <input
            placeholder="Enter preferred contact method"
            type="text"
            id="donation-contact"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            required
          />
          {errors.contact && <p className="error">{errors.contact}</p>}

          <label htmlFor="donation-email">E-mail</label>
          <input
            placeholder="Enter your email address"
            type="email"
            id="donation-email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />

          <legend className="item-info">DONATION ITEM INFORMATION</legend>
          <label htmlFor="donation-item">Item</label>
          <input
            placeholder="Enter the name of item or food"
            type="text"
            id="donation-item"
            name="item"
            value={formData.item}
            onChange={handleChange}
            required
          />

          <label htmlFor="donation-servings">Servings</label>
          <input
            placeholder="Enter the number of servings"
            type="number"
            id="donation-servings"
            name="servings"
            value={formData.servings}
            onChange={handleChange}
          />
          <label htmlFor="donation-expiry-date">Expiry Date</label>
          <input
            type="date"
            id="donation-expiry-date"
            name="expiryDate"
            value={formData.expiryDate}
            onChange={handleChange}
          />
          <label htmlFor="donation-pictures">Pictures Of Item</label>
          <input
            type="file"
            id="donation-pictures"
            name="pictures"
            accept="image/*"
            onChange={handleFileChange}
          />
          <label htmlFor="donation-additional-info">Description</label>
          <textarea
            placeholder="Enter additional information here.."
            id="donation-additional-info"
            name="additionalInfo"
            value={formData.additionalInfo}
            onChange={handleChange}
          ></textarea>
          <button type="submit" disabled={loading || errors.contact}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
          {submissionStatus && <p>{submissionStatus}</p>}
        </form>
      </div>
    </div>
  );
};

export default Form;
