import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion'; // Import motion for animations

// --- Icons (Keep these) ---
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path> <circle cx="12" cy="7" r="4"></circle> </svg>
);
const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect> <path d="M7 11V7a5 5 0 0 1 10 0v4"></path> </svg>
);
// Optional: Add a decorative graphic/icon for the info panel
const InfoGraphicIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginBottom: '20px' }}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="8.5" cy="7" r="4"></circle>
        <polyline points="17 11 19 13 23 9"></polyline> {/* Added checkmark element */}
        <line x1="17" y1="16" x2="17" y2="17"></line> {/* Subtle details */}
        <line x1="19" y1="16" x2="19" y2="17"></line>
    </svg>
);


function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const auth = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await auth.login(email, password);
            navigate(from, { replace: true });
        } catch (err) {
            setError('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.'); // Shorter error
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Inject CSS into <head> (Keep this mechanism for now)
    useEffect(() => {
        const styleId = 'login-page-styles';
        let styleSheet = document.getElementById(styleId);
        if (!styleSheet) {
            styleSheet = document.createElement("style");
            styleSheet.id = styleId;
            styleSheet.type = "text/css";
            document.head.appendChild(styleSheet);
        }
        // Use updated customStyles string
        styleSheet.innerText = customStyles;
    }, []);

    return (
        <div style={styles.container}>
            {/* Animated background element */}
            <div style={styles.backgroundGradient}></div>

            <motion.div // Wrap login box for entry animation
                style={styles.loginBox}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            >
                {/* --- Info Column (Left) --- */}
                <div style={styles.infoPanel} className="info-panel"> {/* Added class for media query */}
                    <InfoGraphicIcon />
                    <h1 style={styles.infoTitle}>HRM Dashboard</h1>
                    <p style={styles.infoSubtitle}>Giải pháp tích hợp quản lý nhân sự & lương bổng.</p>
                </div>

                {/* --- Form Column (Right) --- */}
                <div style={styles.formPanel}>
                    <h2 style={styles.formTitle}>Đăng nhập</h2> {/* Shorter title */}
                    <form onSubmit={handleSubmit}>
                        <div style={styles.inputGroup}>
                            <span style={styles.inputIcon}><UserIcon /></span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="Email" // Simpler placeholder
                                style={styles.input}
                                className="login-input"
                                aria-label="Email"
                            />
                        </div>
                        <div style={styles.inputGroup}>
                             <span style={styles.inputIcon}><LockIcon /></span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Mật khẩu"
                                style={styles.input}
                                className="login-input"
                                aria-label="Password"
                            />
                        </div>

                        {/* Error Message with subtle animation possibility */}
                        {error && (
                            <motion.p
                                style={styles.errorText}
                                role="alert"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                {error}
                            </motion.p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={loading ? {...styles.button, ...styles.buttonDisabled} : styles.button}
                            className="login-button"
                        >
                            {loading ? (
                                <>
                                    <span style={styles.spinner} aria-hidden="true"></span>
                                    Đang xử lý...
                                </>
                            ) : (
                                'Đăng nhập'
                            )}
                        </button>
                    </form>
                     {/* Optional: Add "Forgot Password?" link later */}
                     {/* <p style={styles.forgotPassword}>Quên mật khẩu?</p> */}
                </div>
            </motion.div>
             <footer style={styles.footer}>
                 Phát triển bởi Lâm Chu Bảo Toàn
                 <span>&nbsp;&nbsp;|&nbsp;&nbsp;</span> {/* Separator */}
                 © 2025 HRM Dashboard
             </footer>
        </div>
    );
}

// --- CSS-in-JS Styles (Refined) ---
const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        // Background handled by pseudo-element or separate div
        fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", // Modern font stack
        position: 'relative',
        overflow: 'hidden',
        padding: '20px', // Add padding for smaller screens
    },
    // Animated background
    backgroundGradient: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
        backgroundSize: '400% 400%',
        animation: 'gradientBG 15s ease infinite',
        zIndex: 0,
    },
    loginBox: {
        display: 'flex',
        width: '850px', // Slightly narrower
        maxWidth: '100%', // Ensure it fits mobile view when stacked
        minHeight: '500px', // Min height
        backgroundColor: 'rgba(255, 255, 255, 0.98)', // Slightly transparent white
        backdropFilter: 'blur(5px)', // Blur background behind box (subtle effect)
        borderRadius: '16px', // More rounded
        boxShadow: '0 15px 40px rgba(0, 0, 0, 0.15)', // Softer, larger shadow
        overflow: 'hidden',
        zIndex: 1,
    },
    infoPanel: {
        flex: 1.2, // Give slightly more space to info panel
        padding: '60px 40px',
        background: 'linear-gradient(145deg, #1A2980 0%, #26D0CE 100%)', // New gradient
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center', // Center content vertically and horizontally
        textAlign: 'center',
    },
    infoTitle: {
        fontSize: '2.5rem',
        fontWeight: 700, // Bolder
        marginBottom: '10px',
        textShadow: '1px 1px 4px rgba(0,0,0,0.3)',
    },
    infoSubtitle: {
        fontSize: '1.1rem',
        opacity: '0.9',
        lineHeight: 1.6,
        maxWidth: '300px', // Limit width for better readability
    },
    formPanel: {
        flex: 1, // Slightly less space than info panel
        padding: '50px 50px', // Equal padding
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: '#fff', // Solid white for form area
    },
    formTitle: {
        fontSize: '1.8rem',
        color: '#2d3748', // Darker grey
        fontWeight: 600, // Semi-bold
        marginBottom: '40px',
        textAlign: 'center',
    },
    inputGroup: {
        position: 'relative',
        marginBottom: '20px',
    },
    input: {
        width: '100%',
        padding: '12px 15px 12px 45px', // Adjusted padding
        border: '1px solid #e2e8f0', // Lighter border
        borderRadius: '8px', // More rounding
        fontSize: '1rem',
        color: '#2d3748',
        backgroundColor: '#f7fafc', // Very light input background
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        boxSizing: 'border-box',
    },
    inputIcon: {
        position: 'absolute',
        top: '50%',
        left: '15px',
        transform: 'translateY(-50%)',
        color: '#a0aec0', // Lighter icon color
        pointerEvents: 'none',
        lineHeight: 0, // Ensure icon vertical alignment
    },
    errorText: {
        color: '#e53e3e', // Red error color
        backgroundColor: '#fed7d7', // Light red background
        border: '1px solid #fbb6b6',
        padding: '10px 15px',
        borderRadius: '8px',
        textAlign: 'center',
        marginBottom: '20px',
        fontSize: '0.9rem',
    },
    button: {
        width: '100%',
        padding: '12px',
        border: 'none',
        borderRadius: '8px',
        // Use a gradient for the button
        background: 'linear-gradient(90deg, #1A2980 0%, #26D0CE 100%)',
        color: 'white',
        fontSize: '1.05rem', // Slightly adjusted size
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'opacity 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '15px',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
    },
    buttonDisabled: {
        opacity: 0.6, // Use opacity for disabled state
        cursor: 'not-allowed',
        boxShadow: 'none',
    },
    footer: {
        position: 'absolute',
        bottom: '20px',
        color: '#a0aec0', // Lighter footer text
        fontSize: '0.85rem',
        textAlign: 'center',
        width: '100%',
        zIndex: 0,
    },
    spinner: {
        display: 'inline-block',
        width: '16px',
        height: '16px',
        border: '3px solid rgba(255, 255, 255, 0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginRight: '10px',
    },
    forgotPassword: { // Style for potential forgot password link
        textAlign: 'right',
        marginTop: '10px',
        fontSize: '0.9rem',
        color: '#4a5568', // Grey link color
        cursor: 'pointer',
    }
};

// --- Dynamic CSS rules (Refined) ---
const customStyles = `
    /* Background Gradient Animation */
    @keyframes gradientBG {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }

    /* Input focus effect */
    .login-input:focus {
        border-color: #26D0CE; /* Use accent color */
        background-color: #fff; // White background on focus
        box-shadow: 0 0 0 3px rgba(38, 208, 206, 0.2);
        outline: none;
    }

    /* Button hover/active effects */
    .login-button:hover:not(:disabled) {
        opacity: 0.9;
        box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
        /* transform: translateY(-1px); */ /* Optional subtle lift */
    }
    .login-button:active:not(:disabled) {
        opacity: 1;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        transform: translateY(1px); /* Press down effect */
    }

    /* Spinner animation */
    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    /* Responsive adjustments */
    @media (max-width: 800px) {
        .login-box {
            flex-direction: column; /* Stack vertically */
            width: auto; /* Adjust width */
            max-width: 450px; /* Max width for stacked form */
            height: auto; /* Auto height */
            margin: 20px; /* Add margin */
        }
        .info-panel {
            display: none; /* Hide info panel on small screens */
        }
        .form-panel {
            padding: 40px 30px; /* Adjust padding */
        }
    }
`;

export default Login;