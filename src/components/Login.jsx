import React, { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient, googleClientId, setAuthToken } from "../config";
import styles from "../Login.module.css";
import { useMessageDialog } from "../context/MessageDialogContext";
import { useUser } from "../UserContext";
import GoogleSignInButton from "./GoogleSignInButton";

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
          notifySuccess("You're signed in with Google.", "Welcome");
          navigate("/");
        } else {
          setError("Invalid response from server. Please try again.");
        }
      } catch (err) {
        console.error("Google login failed:", err);
        setError(
          err.response?.data?.message || "Google login failed. Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [navigate, notifySuccess, setUser]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await apiClient.post("/auth/login", data);

      if (response && response.data && response.data.user) {
        const { user } = response.data;
        if (response.data.token) setAuthToken(response.data.token);

        const userData = {
          _id: user._id,
          name:
            user.firstName && user.lastName
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
            <p className={styles.subtitle}>Welcome back — sign in to continue.</p>
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
              Don&apos;t have an account?{" "}
              <Link to="/signup" className={styles.signup_link}>
                Register
              </Link>
            </div>
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
            <div className={styles.terms}>
              By continuing, you agree to the{" "}
              <Link to="/terms" className={styles.terms_link}>
                SustainaDish Terms and Conditions
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className={styles.terms_link}>
                Privacy Policy
              </Link>
              .
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
