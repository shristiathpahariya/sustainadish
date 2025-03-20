import React from 'react';
import logo from "/susss.png"
import '../.././src/privacy.css'

const Privacy = () => {
  return (

    <div className="privacy-policy-container">
      <img src={logo} className="privacylogo" />
      <p className="privacy-policy-title">Privacy Policy</p>
      <p><medium>Effective July 4, 2024</medium></p>

      <h2>Welcome to SustainaDish!</h2>
      <p>
        This Privacy Policy outlines how we collect, use, disclose, and safeguard your information. 
        We prioritize the protection of your privacy and the security of your personal information.
      </p>

      <h3>Information We Collect</h3>
      <p>
        We collect personally identifiable information such as your name, email address, and any other 
        details you provide when using our services or participating in activities. We also collect information 
        about ingredients you input for recipe recommendations and donation preferences for generating interaction posts.
      </p>

      <h3>How We Use Your Information</h3>
      <p>
        We use the information we collect to generate recipes based on the ingredients you input, create and manage 
        donation posts, and analyze usage data to improve and personalize the user experience on SustainaDish. 
        Additionally, we use your information to send updates, notifications, and other relevant information, 
        and to protect against unauthorized access, alteration, or destruction of our application and your personal information.
      </p>

      <h3>How We Share Your Information</h3>
      <p><strong>With Other Users:</strong> Donation posts, including the information you provide in the donation form, will be visible to other users of the web application.</p>
      <p><strong>With Service Providers:</strong> Third-party service providers who perform services on our behalf, such as hosting, data analysis, and customer service.</p>
      <p><strong>For Legal Purposes:</strong> To comply with legal obligations, respond to legal requests, and protect our rights.</p>

      <h3>Security of Your Information</h3>
      <p>
        We use administrative, technical, and physical security measures to help protect your personal information. 
        While we have taken reasonable steps to secure the personal information you provide, please be aware that despite 
        our efforts, no security measures are perfect or impenetrable.
      </p>

      <h3>Contact Us</h3>
      <p>
        If you have any questions or concerns about this Privacy Policy, please <a href="/contact">Contact Us</a>.
      </p>

      </div>
  );
};

export default Privacy;