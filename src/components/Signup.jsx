import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gapi } from 'gapi-script';
import { apiClient, googleClientId } from '../config';
import styles from '../Signup.module.css';
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

    useEffect(() => {
        if (!googleClientId) {
            if (import.meta.env.DEV) {
                console.warn(
                    '[Signup] VITE_GOOGLE_CLIENT_ID is not set; Google sign-in is disabled.'
                );
            }
            return;
        }
        function start() {
            gapi.client.init({
                clientId: googleClientId,
                scope: 'email profile',
            });
        }
        gapi.load('client:auth2', start);
    }, [googleClientId]);

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
        if (!googleClientId) {
            setError('Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID in your environment.');
            return;
        }
        const auth2 = gapi.auth2.getAuthInstance();
        auth2
            .signIn()
            .then(async (googleUser) => {
                const profile = googleUser.getBasicProfile();
                setLoading(true);
                setError('');
                try {
                    const response = await apiClient.post('/auth/google', {
                        email: profile.getEmail(),
                        name: profile.getName(),
                        profilePicture: profile.getImageUrl(),
                    });

                    if (response?.data?.user) {
                        const u = response.data.user;
                        const userData = {
                            _id: u._id,
                            name:
                                u.firstName && u.lastName
                                    ? `${u.firstName} ${u.lastName}`
                                    : profile.getName(),
                            email: u.email,
                            googleLogin: true,
                            location: u.location,
                            contact: u.contact,
                            profilePicture:
                                u.profilePicture || profile.getImageUrl() || '/user.png',
                        };
                        setUser(userData);
                        notifySuccess('Your Google account is ready to use.', 'Welcome');
                        navigate('/');
                    } else {
                        setError('Invalid response from server. Please try again.');
                    }
                } catch (err) {
                    console.error('Google SignUp failed:', err);
                    setError(
                        err.response?.data?.message ||
                            'Google SignUp failed. Please try again.'
                    );
                } finally {
                    setLoading(false);
                }
            })
            .catch((error) => {
                console.error('Google sign-in failed:', error);
                setError('Google SignUp failed. Please try again.');
            });
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
                        <p className={styles.subtitle}>Join SustainaDish to share and discover sustainable recipes.</p>
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
                            <input type="checkbox" className={styles.checkbox} id="signup-terms" required aria-label="Agree to terms and privacy policy" />
                            <p className={styles.conditions}>
                                I’ve read and agree to the{' '}
                                <Link to="/terms" className={styles.terms_link}>Terms and Conditions</Link>
                                {' '}and{' '}
                                <Link to="/privacy" className={styles.terms_link}>Privacy Policy</Link>.
                            </p>
                        </div>
                        <button type="submit" className={styles.orange_btn} disabled={loading}>
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </button>

                        <div className={styles.separator}><span>OR</span></div>

                        <button
                            type="button"
                            className={styles.google_btn}
                            onClick={handleGoogleSignUp}
                            disabled={loading}
                        >
                            <img src="/googleLogo.png" alt="Google" />
                            Continue with Google
                        </button>

                        <div className={styles.login_prompt}>
                            Already have an account?{' '}
                            <Link to="/login" className={styles.login_link}>Log in</Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Signup;
