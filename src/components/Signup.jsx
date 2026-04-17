import React, { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient, googleClientId, setAuthToken } from "../config";
import styles from "../Signup.module.css";
import { useMessageDialog } from "../context/MessageDialogContext";
import { useUser } from "../UserContext";
import GoogleSignInButton from "./GoogleSignInButton";

const Signup = () => {
  const { setUser } = useUser();
  const { notifySuccess } = useMessageDialog();
  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    location: "",
    contact: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = ({ currentTarget: input }) => {
    setData({ ...data, [input.name]: input.value });
  };

  const completeGoogleSession = useCallback(
    async ({ email, name, profilePicture }) => {
      setLoading(true);
      setError("");
      try {
        const response = await apiClient.post("/auth/google", {
          email,
          name,
          profilePicture,
        });

        if (response?.data?.user) {
          if (response.data.token) setAuthToken(response.data.token);
          const u = response.data.user;
          const userData = {
            _id: u._id,
            name:
              u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : name || u.email,
            email: u.email,
            googleLogin: true,
            location: u.location,
            contact: u.contact,
            profilePicture: u.profilePicture || profilePicture || "/user.png",
          };
          setUser(userData);
          notifySuccess("Your Google account is ready to use.", "Welcome");
          navigate("/");
        } else {
          setError("Invalid response from server. Please try again.");
        }
      } catch (err) {
        console.error("Google SignUp failed:", err);
        setError(
          err.response?.data?.message || "Google SignUp failed. Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [navigate, notifySuccess, setUser]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiClient.post("/auth/register", data);

      if (response.data && response.data.user) {
        const userData = {
          _id: response.data.user._id,
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          googleLogin: false,
        };

        localStorage.setItem("user", JSON.stringify(userData));
        navigate("/login");
      }
    } catch (error) {
      if (error.response && error.response.status >= 400 && error.response.status <= 500) {
        setError(error.response.data.message || "Registration failed. Please try again.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.signup_container}>
      <div className={styles.signup_form_container}>
        <div className={styles.left}>
          <img src="/watermelon.jpeg" alt="Fresh ingredients" className={styles.signup_image} />
        </div>
        <div className={styles.right}>
          <form className={styles.signup_form} onSubmit={handleSubmit}>
            <h1 className={styles.title}>Create account</h1>
            <p className={styles.subtitle}>
              Join SustainaDish to share and discover sustainable recipes.
            </p>
            <div className={styles.name_input}>
              <input
                type="text"
                placeholder="First Name"
                name="firstName"
                onChange={handleChange}
                value={data.firstName}
                required
                className={styles.input}
              />
              <input
                type="text"
                placeholder="Last Name"
                name="lastName"
                onChange={handleChange}
                value={data.lastName}
                required
                className={styles.input}
              />
            </div>
            <input
              type="email"
              placeholder="Email"
              name="email"
              onChange={handleChange}
              value={data.email}
              required
              className={styles.input}
              autoComplete="username"
            />
            <input
              type="password"
              placeholder="Password"
              name="password"
              onChange={handleChange}
              value={data.password}
              required
              className={styles.input}
              autoComplete="new-password"
            />
            <input
              type="password"
              placeholder="Confirm Password"
              name="confirmPassword"
              onChange={handleChange}
              value={data.confirmPassword}
              required
              className={styles.input}
              autoComplete="new-password"
            />
            {error && <div className={styles.error_msg}>{error}</div>}
            <div className={styles.agreeRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                id="signup-terms"
                required
                aria-label="Agree to terms and privacy policy"
              />
              <p className={styles.conditions}>
                I&apos;ve read and agree to the{" "}
                <Link to="/terms" className={styles.terms_link}>
                  Terms and Conditions
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className={styles.terms_link}>
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
            <button type="submit" className={styles.orange_btn} disabled={loading}>
              {loading ? "Creating Account..." : "Sign Up"}
            </button>

            <div className={styles.separator}>
              <span>OR</span>
            </div>

            {googleClientId ? (
              <div
                className={styles.google_gsi_wrap}
                style={loading ? { pointerEvents: "none", opacity: 0.72 } : undefined}
                aria-busy={loading}
              >
                <GoogleSignInButton
                  clientId={googleClientId}
                  className={styles.google_gsi_mount}
                  onSuccess={(payload) => {
                    if (!loading) completeGoogleSession(payload);
                  }}
                />
              </div>
            ) : (
              <p className={styles.error_msg} style={{ fontSize: "0.85rem" }}>
                Google sign-in is not configured (set{" "}
                <code style={{ fontSize: "0.8rem" }}>VITE_GOOGLE_CLIENT_ID</code>).
              </p>
            )}

            <div className={styles.login_prompt}>
              Already have an account?{" "}
              <Link to="/login" className={styles.login_link}>
                Log in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
