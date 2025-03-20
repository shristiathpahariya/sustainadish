import React from "react";
import { useNavigate } from "react-router-dom";
import '../.././src/footer.css'

export default function Footer(){
  const navigate = useNavigate()

    const handleClick=()=>{
      navigate('/privacy')
    }

    const handleClickTerms=()=>{
      navigate('/terms')
    }
    const handleFeedback=()=>{
      navigate('/feedback')
    }
    const handleContact=()=>{
      navigate('/contactus')
    }

    return(
        <footer className="Footer">
            <div className="footer-top">
<img src="/susss.png" alt="logo" className="footerImage" />
<a className="feedback" onClick={handleFeedback}>Feedback</a>
<div class="footer-links">
        <p>Quick Link</p>
        <a onClick={handleClickTerms}>Term & Conditions</a>
        <a onClick={handleClick}>Privacy Policy</a>
      </div>
      <div class="footer-contact">
        <a onClick={handleContact}>Contact Us</a>
      </div>
      </div>
      <div class="footer-bottom">
      <p>&copy; 2024 sustainadish, inc. All Rights Reserved</p>
    </div>
        </footer>
    )
}