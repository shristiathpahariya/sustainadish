import React, { useState } from 'react';
import Popup from './Popup';
import { apiUrl } from '../config';
import '../../src/feedback.css';
import { useNavigate } from 'react-router-dom';

const Feedback = () => {
  const [rating, setRating] = useState(null); 
  const [feedback, setFeedback] = useState('');
  const [isPopupOpen, setIsPopupOpen] = useState(false); // Initially false to hide popup
  const [isFormVisible, setIsFormVisible] = useState(true); // Track visibility of the form
  const navigate = useNavigate()

  const handleRatingChange = (value) => {
    setRating(value);
  };

  const handleFeedbackChange = (event) => {
    setFeedback(event.target.value);
  };

  const handleSubmit = async () => {
    // Validate form inputs
    if (!rating) {
      alert('Please select a rating before submitting.');
      return;
    }

    if (feedback.trim() === '') {
      alert('Please provide feedback before submitting.');
      return;
    }

    // Prepare data to be sent to the backend
    const feedbackData = { rating, feedback };

    try {
      // Send feedback data to the backend
      const response = await fetch(`${apiUrl}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Server response:', result); // Log the response for debugging

      // Open the Popup upon successful form submission
      setIsPopupOpen(true);
    } catch (error) {
      // Handle network errors
      console.error('Network error:', error);
      alert(`Network error. Please try again later. Error: ${error.message}`);
    }
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
  };

  const handleCloseForm=()=>{
    navigate('/')
  }

  return (
    <div className={`feedback-form ${isFormVisible ? '' : 'hidden'}`}>
      <button className="close-form-button" onClick={handleCloseForm}>×</button>
      <h2>Rate your experience</h2>
      <div className="stars">
        {[5, 4, 3, 2, 1].map((star) => (
          <React.Fragment key={star}>
            <input
              type="radio"
              id={`star${star}`}
              name="rating"
              value={star}
              checked={rating === star}
              onChange={() => handleRatingChange(star)}
            />
            <label htmlFor={`star${star}`}>&#9733;</label>
          </React.Fragment>
        ))}
      </div>
      <p>Please share your review</p>
      <textarea placeholder="Enter your feedback here...." value={feedback} onChange={handleFeedbackChange} />
      <div className="button-wrapper">
        <button type="button" onClick={handleSubmit} className='submit'>Submit</button>
      </div>

      {/* Conditional Popup rendering */}
      {isPopupOpen && (
        <Popup
          isOpen={isPopupOpen}
          onRequestClose={handleClosePopup}
          contentLabel="Thank You Popup"
          className="thank-you-Popup"
          overlayClassName="Popup-overlay"
        >
          <div className="Popup-content">
            <p className='feedbackthanks'>Thank You for your Feedback!</p>
          </div>
        </Popup>
      )}
    </div>
  );
};

export default Feedback;
