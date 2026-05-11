import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
import logo from "/susss.png";
import "../../src/Nav.css";
import { useUser } from "../UserContext";
import { useMessageDialog } from "../context/MessageDialogContext";

const DEFAULT_PROFILE_PIC = "/user.png";

export default function Navbar() {
  const { user, logout } = useUser();
  const { notifyInfo } = useMessageDialog();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const go = (path) => {
    navigate(path);
    closeMenu();
  };

  const handleClickHome = () => go("/");
  const handleClickAboutUs = () => go("/aboutus");
  const handleClickFeed = () => go("/feed");
  const handleClickContactUs = () => go("/contactUs");

  const handleDonateClick = () => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      notifyInfo("Sign in to donate and track your impact.", "Sign in required");
      navigate("/login");
    } else {
      navigate("/donationform");
    }
    closeMenu();
  };

  const handleProfileClick = () => go("/profile");

  const handleLogout = async () => {
    closeMenu();
    await logout();
    navigate("/");
  };

  const displayName =
    user?.name?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    "Account";

  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar__inner">
        <div className="navbar__start">
          <button
            type="button"
            className="navbar__logo-btn"
            onClick={handleClickHome}
            aria-label="Sustainadish home"
          >
            <img src={logo} className="navbar__logo" alt="" />
          </button>

          <button
            type="button"
            className="navbar__toggle"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="navbar-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={26} strokeWidth={2} /> : <Menu size={26} strokeWidth={2} />}
          </button>
        </div>

        <div
          id="navbar-menu"
          className={`navbar__menu ${menuOpen ? "navbar__menu--open" : ""}`}
        >
          <div className="navbar__links">
            <button type="button" className="nav--title" onClick={handleClickHome}>
              Home
            </button>
            {/* <button type="button" className="nav--title" onClick={handleClickAboutUs}>
              About Us
            </button> */}
            <button type="button" className="nav--title" onClick={handleClickFeed}>
              Feed
            </button>
            <button type="button" className="nav--title" onClick={handleDonateClick}>
              Donate
            </button>
            <button type="button" className="nav--title" onClick={handleClickContactUs}>
              Contact Us
            </button>
          </div>

          {user ? (
            <div className="navbar__actions">
              <button
                type="button"
                className="navbar__profile"
                onClick={handleProfileClick}
                aria-label={`Profile: ${displayName}`}
              >
                <img
                  src={user.profilePicture || DEFAULT_PROFILE_PIC}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = DEFAULT_PROFILE_PIC;
                  }}
                  alt=""
                  className="navbar__avatar"
                />
                <span className="navbar__name">{displayName}</span>
              </button>
              <button
                type="button"
                className="navbar__logout"
                onClick={handleLogout}
              >
                <LogOut size={18} strokeWidth={2} aria-hidden />
                <span>Log out</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
