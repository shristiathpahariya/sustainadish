import React, { useState } from "react";
import { apiUrl } from "../config";
import { useMessageDialog } from "../context/MessageDialogContext";

const Contactform = () => {
  const { notifySuccess, notifyError, notifyInfo } = useMessageDialog();
  const [isTermsChecked, setTermsChecked] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isTermsChecked) {
      notifyInfo("Please agree to the terms and conditions before sending.", "Terms");
      return;
    }

    const formData = {
      firstName: e.target.firstName.value,
      lastName: e.target.lastName.value,
      email: e.target.email.value,
      contact: e.target.contact.value,
      location: e.target.location.value,
      message: e.target.message.value,
    };

    try {
      const response = await fetch(`${apiUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        e.target.reset();
        setTermsChecked(false);
        notifySuccess(
          "We'll get back to you within 24 hours.",
          "Message sent"
        );
      } else {
        notifyError("We couldn't send your message. Please try again in a moment.");
      }
    } catch (error) {
      console.error("Error submitting the form:", error);
      notifyError("Something went wrong while sending. Check your connection and try again.");
    }
  };

  return (
    <div className="contact-form">
      <h2 className="contact-form__title">We&apos;d love to help</h2>
      <p className="contact-form__subtitle">
        Reach out and we&apos;ll get in touch within 24 hours.
      </p>

      <form id="contactForm" className="contact-form__fields" onSubmit={handleSubmit} noValidate>
        <div className="contact-form__grid2">
          <div className="contact-form__field">
            <label className="contact-form__label" htmlFor="contact-firstName">
              First name
            </label>
            <input
              id="contact-firstName"
              type="text"
              name="firstName"
              placeholder="First name"
              required
              autoComplete="given-name"
            />
          </div>
          <div className="contact-form__field">
            <label className="contact-form__label" htmlFor="contact-lastName">
              Last name
            </label>
            <input
              id="contact-lastName"
              type="text"
              name="lastName"
              placeholder="Last name"
              required
              autoComplete="family-name"
            />
          </div>
        </div>

        <div className="contact-form__field contact-form__field--full">
          <label className="contact-form__label" htmlFor="contact-email">
            Email
          </label>
          <input
            id="contact-email"
            type="email"
            name="email"
            placeholder="Email address"
            required
            autoComplete="email"
          />
        </div>

        <div className="contact-form__grid2">
          <div className="contact-form__field">
            <label className="contact-form__label" htmlFor="contact-phone">
              Contact
            </label>
            <input
              id="contact-phone"
              type="text"
              name="contact"
              placeholder="Phone or preferred contact"
              required
              autoComplete="tel"
            />
          </div>
          <div className="contact-form__field">
            <label className="contact-form__label" htmlFor="contact-location">
              Location
            </label>
            <input
              id="contact-location"
              type="text"
              name="location"
              placeholder="City or area"
              required
              autoComplete="address-level2"
            />
          </div>
        </div>
        <div className="contact-form__field contact-form__field--full">
          <label className="contact-form__label" htmlFor="contact-message">
            Message
          </label>
          <textarea
            id="contact-message"
            name="message"
            placeholder="Type your message here"
            required
            rows={5}
          />
        </div>

        <div className="contact-form__terms">
          <input
            type="checkbox"
            id="terms-checkbox"
            name="terms"
            checked={isTermsChecked}
            onChange={(e) => setTermsChecked(e.target.checked)}
          />
          <label htmlFor="terms-checkbox">
            I agree to SustainaDish terms and conditions
          </label>
        </div>

        <div className="contact-form__actions">
          <button type="submit">Send message</button>
        </div>
      </form>
    </div>
  );
};

export default Contactform;
