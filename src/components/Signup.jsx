import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../config';
import styles from '../../src/Signup.module.css'; // Custom CSS
import { useMessageDialog } from '../context/MessageDialogContext';
import { useUser } from '../UserContext';


const Signup = () => {
  const { setUser } = useUser();
  const { notifySuccess } = useMessageDialog();
    const [data, setData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        location: '', 
        contact: '' 
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = ({ currentTarget: input }) => {
        setData({ ...data, [input.name]: input.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (data.password !== data.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const response = await apiClient.post('/auth/register', data);
            
            // Store user details in localStorage after registration (token is in httpOnly cookie)
            if (response.data && response.data.user) {
                const userData = {
                    _id: response.data.user._id,
                    name: `${data.firstName} ${data.lastName}`, 
                    email: data.email,
                    googleLogin: false,
                };
                
                localStorage.setItem("user", JSON.stringify(userData));
                navigate('/login');
            }
        } catch (error) {
            if (error.response && error.response.status >= 400 && error.response.status <= 500) {
                setError(error.response.data.message || 'Registration failed. Please try again.');
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignUp = () => {
        const auth2 = gapi.auth2.getAuthInstance();
        auth2.signIn().then((user) => {
          const profile = user.getBasicProfile();
    
          // Store user information with Google profile picture
          const userData = {
            name: profile.getName(),
            email: profile.getEmail(),
            googleLogin: true, // Set flag for Google login
          };
    
          setUser(userData);

          notifySuccess("Your Google account is ready to use.", "Welcome");
          navigate("/");
        }).catch((error) => {
          console.error("Google SignUp failed:", error);
          setError("Google SignUp failed. Please try again.");
        });
      };

    return (
        <div className={styles.signup_container}>
            <div className={styles.signup_form_container}>
                <div className={styles.left}>
                    <form className={styles.signup_form} onSubmit={handleSubmit}>
                        <h1>Sign Up</h1>
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
                        <button type="submit" className={styles.orange_btn} disabled={loading}>
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </button>

                        <div className={styles.separator}><span>OR</span></div>

                        <button
                            type="button"
                            className={styles.google_btn}
                            onClick={handleGoogleSignUp}
                        >
                            <img src="/googleLogo.png" alt="Google" />
                            Continue with Google
                        </button>

                        <div className={styles.login_prompt}>
                            Already have an account?{' '}
                            <Link to="/login" className={styles.login_link}>Login</Link>
                        </div>
                        <div className={styles.inputcheck}>
                        <input type="checkbox" className={styles.checkbox} required/><p className='conditions'>I’ve read and agree with the <Link to="/terms" className={styles.terms_link}>SustainaDish Terms and Conditions</Link>&nbsp;
                         and &nbsp; <Link to="/privacy" className={styles.terms_link}>Privacy Policy</Link>. </p>
                         </div>
                    </form>
                </div>
                <div className={styles.right}>
                    <img src="/watermelon.jpeg" alt="Signup" className={styles.signup_image} />
                </div>
            </div>
        </div>
    );
};

export default Signup;
