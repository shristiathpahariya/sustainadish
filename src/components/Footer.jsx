import React from "react";
import { Link } from "react-router-dom";
import "../footer.css";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <Link to="/" className="site-footer__brand" aria-label="SustainaDish home">
            <img src="/susss.png" alt="" className="site-footer__logo" />
          </Link>

          <nav className="site-footer__nav" aria-label="Footer">
            <p className="site-footer__nav-title">Quick links</p>
            <ul className="site-footer__links">
              <li>
                <Link to="/terms" className="site-footer__link">
                  Terms &amp; conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="site-footer__link">
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link to="/feedback" className="site-footer__link">
                  Feedback
                </Link>
              </li>
              <li>
                <Link to="/feed" className="site-footer__link">
                  Community feed
                </Link>
              </li>
              <li>
                <Link to="/contactUs" className="site-footer__link">
                  Contact us
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="site-footer__bottom">
          <p className="site-footer__copy">
            &copy; {new Date().getFullYear()} SustainaDish, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
