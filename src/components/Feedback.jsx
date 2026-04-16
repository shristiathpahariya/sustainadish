import React, { useState } from 'react';
import { apiUrl } from '../config';
import '../../src/feedback.css';
import { useNavigate } from 'react-router-dom';
import { useMessageDialog } from '../context/MessageDialogContext';

const Feedback = () => {
  const { notifySuccess, notifyError, notifyInfo } = useMessageDialog();
  const [rating, setRating] = useState(null); 
  const [feedback, setFeedback] = useState('');
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
      notifyInfo('Please select a star rating before submitting.', 'Rating required');
      return;
    }

    if (feedback.trim() === '') {
      notifyInfo('Please write a short comment in the feedback box.', 'Feedback required');
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

      await response.json();

      setRating(null);
      setFeedback('');
      notifySuccess('Your feedback helps us improve SustainaDish.', 'Thank you');
    } catch (error) {
      console.error('Network error:', error);
      notifyError(
        error?.message
          ? `We couldn't submit your feedback: ${error.message}`
          : "We couldn't reach the server. Please try again shortly."
      );
    }
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
    </div>
  );
};

export default Feedback;
