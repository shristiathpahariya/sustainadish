import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { gapi } from "gapi-script"; // For Google OAuth
import { apiClient } from "../config";
import styles from "../../src/Login.module.css"; // Custom CSS
import { useMessageDialog } from "../context/MessageDialogContext";
import { useUser } from "../UserContext";

const Login = () => {
  const { setUser } = useUser();
  const { notifySuccess } = useMessageDialog();
  const [data, setData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Handle input changes
  const handleChange = ({ currentTarget: input }) => {
    setData({ ...data, [input.name]: input.value });
  };

  // Initialize Google OAuth with gapi
  useEffect(() => {
    function start() {
      gapi.client.init({
        clientId: "196811482048-2q1m1kpubrhedvukdc4odeetg88jgnco.apps.googleusercontent.com",
        scope: "email profile",
      });
    }
    gapi.load("client:auth2", start);
  }, []);

  // Handle Google login
  const handleGoogleLogin = () => {
    const auth2 = gapi.auth2.getAuthInstance();
    auth2.signIn().then((user) => {
      const profile = user.getBasicProfile();

      // Store user information with Google profile picture
      const userData = {
        name: profile.getName(),
        email: profile.getEmail(),
        googleLogin: true,
        profilePicture: profile.getImageUrl(),
      };

      setUser(userData);

      notifySuccess("You're signed in with Google.", "Welcome");
      navigate("/");
    }).catch((error) => {
      console.error("Google login failed:", error);
      setError("Google login failed. Please try again.");
    });
  };

  // Handle form submission for traditional login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', data);
      
      if (response && response.data && response.data.user) {
        const { user } = response.data;
        
        // Store user info in localStorage (token is now in httpOnly cookie)
        const userData = {
          _id: user._id,
          name: user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}`
                : data.email,
          email: user.email,
          googleLogin: user.googleLogin === true,
          location: user.location,
          contact: user.contact,
          profilePicture: user.profilePicture || "/user.png",
        };

        setUser(userData);

        notifySuccess("Welcome back to SustainaDish.", "Signed in");
        navigate("/");
      } else {
        setError("Invalid response from server. Please try again.");
      }
    } catch (error) {
      if (error.response && error.response.status >= 400 && error.response.status <= 500) {
        setError(error.response.data.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.login_container}>
      <div className={styles.login_form_container}>
        <div className={styles.left}>
          <img src="/apple.jpeg" alt="Delicious meal" className={styles.image} />
        </div>
        <div className={styles.right}>
          <form className={styles.form_container} onSubmit={handleSubmit}>
            <h1 className={styles.title}>Log in</h1>
            <input
              type="email"
              placeholder="Enter your email"
              name="email"
              onChange={handleChange}
              value={data.email}
              required
              className={styles.input}
            />
            <input
              type="password"
              placeholder="Password"
              name="password"
              onChange={handleChange}
              value={data.password}
              required
              className={styles.input}
            />
            {error && <div className={styles.error_msg}>{error}</div>}
            <button type="submit" className={styles.continue_btn} disabled={loading}>
              {loading ? "Loading..." : "Continue"}
            </button>
            <div className={styles.signup_prompt}>
              Don't have an account?{" "}
              <Link to="/signup" className={styles.signup_link}>
                Register
              </Link>
            </div>
            <div className={styles.separator}><span>OR</span></div>
            <button type="button" className={styles.google_btn} onClick={handleGoogleLogin}>
              <img src="/googleLogo.png" alt="Google" className={styles.google_logo} />
              Continue with Google
            </button>
            <div className={styles.terms}>
              By continuing, you agree to the {" "}
              <Link to="/terms" className={styles.terms_link}>SustainaDish Terms and Conditions</Link> and{" "}
              <Link to="/privacy" className={styles.terms_link}>Privacy Policy</Link>.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

