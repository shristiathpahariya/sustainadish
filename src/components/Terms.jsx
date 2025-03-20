import React from 'react'
import logo from "/susss.png"
import '../.././src/terms.css'

function Terms(){
    return(
      <div>
    <main class="main-content">
  
    <header>
            <img src={logo} className="termslogo" />
        </header>
  
        <h1>Terms and Conditions</h1>
        <p>Welcome to our website! By accessing this platform, you agree to abide by these terms and conditions. Please read them carefully.</p>


        <h2>Use of the Platform</h2>
        <p>You must be at least 18 years old or have parental consent to use our services. You agree to use the platform only for lawful purposes and in a way that does not infringe the rights of others.</p>

  

        <h2>Recipe Recommendations</h2>
        <p>Recipes shared on this platform are for informational purposes only. We are not responsible for any consequences resulting from their use. Users are encouraged to verify ingredients for any allergies or dietary restrictions before using recipes.</p>

  
     
        <h2>Donation Platform</h2>
        <p>Donations made through our platform are voluntary and non-refundable. We strive to ensure transparency in donation distribution but do not guarantee the end use of donations made.</p>

  
     
        <h2>User Conduct</h2>
        <p>You agree not to post or transmit any content that is unlawful, threatening, abusive, defamatory, or otherwise objectionable. Respect the privacy and rights of others when using our platform.</p>

  
     
        <h2>Intellectual Property</h2>
        <p>All content on this platform, including recipes, logos, and designs, are the property of Sustainadish. You may not use our intellectual property without permission.</p>

  

        <h2>Limitation of Liability</h2>
        <p>We strive to provide accurate and reliable information but do not guarantee the accuracy, completeness, or suitability of any content. We are not liable for any direct, indirect, incidental, or consequential damages arising from your use of the platform.</p>

  
      
        <h2>Changes to Terms</h2>
        <p>We reserve the right to update or modify these terms and conditions at any time. Changes will be effective immediately upon posting.</p>

    </main>
    </div>
  )
};


export default Terms;