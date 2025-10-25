import React, { useState, useEffect } from 'react';
// Use NavLink for active styling
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationsBell from '../components/NotificationsBell'; // Assuming this exists
import { motion, AnimatePresence } from 'framer-motion';

// --- Icons ---
// Icons from Version 2 (Base)
const UserAvatarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="5"></circle>
        <path d="M20 21a8 8 0 1 0-16 0"></path>
    </svg>
);
const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
);
const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
);

// Icons from Version 1 (Upgrade)
const MenuIcon = () => ( // Icon for sidebar toggle
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
);
const LogoutIcon = () => ( // Icon for logout
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
);

// --- Placeholders for Nav Icons (Replace <svg ... /> with actual SVG code) ---
const DashboardIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const UsersIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const EmployeesIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>;
const OrgIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h4v0a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"></path><path d="M18 15h-4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2z"></path><path d="M6 15h.01"></path><path d="M6 18h.01"></path><path d="M14 15h.01"></path><path d="M14 18h.01"></path><path d="M10 9v.01"></path><path d="M18 9v.01"></path><path d="M14 22v-3a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v3"></path><path d="M14 9V6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v3"></path></svg>;
const PayrollIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const ReportsIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.2 2H8.8A1.8 1.8 0 0 0 7 3.8v16.4A1.8 1.8 0 0 0 8.8 22h6.4a1.8 1.8 0 0 0 1.8-1.8V3.8A1.8 1.8 0 0 0 15.2 2z"></path><path d="M8 12h8"></path><path d="M8 16h8"></path><path d="M11 7.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"></path></svg>;
const ProfileIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
// --- End Icons ---


const Layout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation(); // Needed for Framer Motion key

    // --- State ---
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        // Default to light mode if no preference saved or system preference is light
        return savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    // --- Handlers ---
    const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);
    const toggleTheme = () => {
        setIsDarkMode(prevMode => {
            const newMode = !prevMode;
            localStorage.setItem('theme', newMode ? 'dark' : 'light');
            return newMode;
        });
    };
    const handleLogout = () => {
        // Add confirmation dialog
        if (window.confirm("Bạn có chắc chắn muốn đăng xuất?")) {
             logout();
             navigate('/login');
        }
    };

    // --- Effects ---
    // Apply theme class to body
    useEffect(() => {
        document.body.className = isDarkMode ? 'theme-dark' : 'theme-light';
    }, [isDarkMode]);

    // Inject dynamic CSS styles
    useEffect(() => {
        const styleId = 'layout-dynamic-styles';
        let styleSheet = document.getElementById(styleId);
        if (!styleSheet) {
            styleSheet = document.createElement("style");
            styleSheet.id = styleId;
            styleSheet.type = "text/css";
            document.head.appendChild(styleSheet);
        }
        styleSheet.innerText = customLayoutStyles; // CSS string defined below
        // Optional cleanup: remove style on component unmount
        // return () => { if (styleSheet) document.head.removeChild(styleSheet); };
    }, []); // Run only once

    // --- Role Checks ---
    const isAdmin = user?.role === 'Admin';
    const isHrManager = user?.role === 'HR Manager';
    const isPayrollManager = user?.role === 'Payroll Manager';
    const isEmployee = user?.role === 'Employee';

    // --- Dynamic Styles ---
    // Function to apply active style to NavLink
    const getNavLinkStyle = ({ isActive }) => ({
        ...styles.navLinkBase,
        ...(isActive ? styles.navLinkActive : styles.navLinkInactive),
        justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', // Center icon when collapsed
    });

    // Sidebar width based on state
    const sidebarWidth = isSidebarCollapsed ? '80px' : '250px';
    const dynamicSidebarStyle = {
        ...styles.sidebar,
        width: sidebarWidth,
    };
    const dynamicMainContentStyle = {
        ...styles.mainContentWrapper,
        marginLeft: sidebarWidth,
    };

    // --- Framer Motion Variants ---
    const pageVariants = {
        initial: { opacity: 0, y: 15 }, // Slide up slightly
        in: { opacity: 1, y: 0 },
        out: { opacity: 0, y: -15 } // Slide up slightly
    };
    const pageTransition = { type: "tween", ease: "easeInOut", duration: 0.3 };

    return (
        <div style={styles.layoutContainer} className={isDarkMode ? 'theme-dark' : 'theme-light'}>
            {/* --- Sidebar --- */}
            <motion.nav
                style={dynamicSidebarStyle}
                animate={{ width: sidebarWidth }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            >
                 {/* Sidebar Header with Toggle */}
                 <div style={styles.sidebarHeader}>
                     {!isSidebarCollapsed && <h3 style={styles.sidebarTitle}>HRM Dashboard</h3>}
                     <button onClick={toggleSidebar} style={styles.sidebarToggle} title={isSidebarCollapsed ? "Mở rộng" : "Thu gọn"}>
                         <MenuIcon />
                     </button>
                 </div>

                <ul style={styles.navList}>
                    {/* Use NavLink for automatic active class handling */}
                    <li><NavLink to="/" style={getNavLinkStyle} end>
                        <DashboardIcon /> {!isSidebarCollapsed && <span>Dashboard</span>}
                    </NavLink></li>

                    {isAdmin && (
                        <li style={styles.adminLinkSeparator}><NavLink to="/user-management" style={getNavLinkStyle}>
                           <UsersIcon /> {!isSidebarCollapsed && <span>Quản lý Tài khoản</span>}
                        </NavLink></li>
                    )}
                     {isEmployee && user?.emp_id && (
                        <li><NavLink to={`/employees/${user.emp_id}`} style={getNavLinkStyle}>
                           <ProfileIcon/> {!isSidebarCollapsed && <span>Hồ sơ của tôi</span>}
                        </NavLink></li>
                     )}

                    {(isAdmin || isHrManager) && (
                        <li><NavLink to="/employees" style={getNavLinkStyle}>
                           <EmployeesIcon /> {!isSidebarCollapsed && <span>Quản lý Nhân viên</span>}
                        </NavLink></li>
                    )}

                    {(isAdmin || isHrManager) && (
                        <li><NavLink to="/management" style={getNavLinkStyle}>
                            <OrgIcon/> {!isSidebarCollapsed && <span>Quản lý Tổ chức</span>}
                        </NavLink></li>
                    )}

                    {(isAdmin || isPayrollManager) && (
                        <li><NavLink to="/payroll" style={getNavLinkStyle}>
                            <PayrollIcon/> {!isSidebarCollapsed && <span>Quản lý Bảng lương</span>}
                        </NavLink></li>
                    )}

                    {(isAdmin || isHrManager || isPayrollManager) && (
                        <li><NavLink to="/reports" style={getNavLinkStyle}>
                            <ReportsIcon/> {!isSidebarCollapsed && <span>Báo cáo</span>}
                        </NavLink></li>
                    )}
                </ul>
            </motion.nav>

            {/* --- Main Content Area --- */}
            <motion.div
                style={dynamicMainContentStyle}
                animate={{ marginLeft: sidebarWidth }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            >
                {/* --- Header --- */}
                <header style={styles.header}>
                    {/* Can add breadcrumbs or page title here */}
                    <div></div> {/* Left placeholder */}
                    <div style={styles.headerRight}>
                        <NotificationsBell />
                        <button onClick={toggleTheme} style={styles.themeToggleButton} title="Chuyển chế độ Sáng/Tối">
                            {isDarkMode ? <SunIcon /> : <MoonIcon />}
                        </button>
                        <div style={styles.userMenu}>
                             <UserAvatarIcon />
                            <span style={styles.userEmail}>{user?.email}</span>
                            <span style={styles.userRole}>({user?.role})</span>
                        </div>
                        <button onClick={handleLogout} style={styles.logoutButton} className="logout-button" title="Đăng xuất">
                           <LogoutIcon />
                           {/* <span>Đăng xuất</span> */} {/* Optional text */}
                        </button>
                    </div>
                </header>

                {/* --- Page Content with Animation --- */}
                <main style={styles.contentArea}>
                    {/* AnimatePresence helps with exit animations */}
                    <AnimatePresence mode="wait">
                         <motion.div
                            key={location.pathname} // Re-renders on path change
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={pageVariants}
                            transition={pageTransition}
                         >
                            <Outlet /> {/* Renders the matched child route */}
                         </motion.div>
                    </AnimatePresence>
                </main>
            </motion.div>
        </div>
    );
};

// --- Enhanced Styles using CSS Variables ---
const styles = {
    layoutContainer: {
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-color)', // Use variable
    },
    sidebar: {
        // width is dynamic
        borderRight: '1px solid var(--border-color)',
        background: 'var(--sidebar-bg)',
        padding: '0', // Remove padding, handle internally
        boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
        position: 'fixed', // Keep fixed
        top: 0,
        left: 0,
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden', // Hide horizontal scrollbar
        zIndex: 100, // Ensure sidebar is on top
        display: 'flex',
        flexDirection: 'column',
    },
     sidebarHeader: {
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'space-between', // Space between title and button
         padding: '15px', // Consistent padding
         height: '60px', // Match header height
         borderBottom: '1px solid var(--border-color)',
         flexShrink: 0, // Prevent header from shrinking
     },
    sidebarTitle: {
        fontSize: '1.3rem', // Slightly smaller
        color: 'var(--primary-color)',
        margin: 0,
        whiteSpace: 'nowrap', // Prevent title wrapping
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
     sidebarToggle: {
         background: 'none',
         border: 'none',
         cursor: 'pointer',
         padding: '5px',
         display: 'flex',
         color: 'var(--text-color-secondary)',
         borderRadius: '4px',
     },
    navList: {
        listStyleType: 'none',
        padding: '15px', // Add padding around the list itself
        margin: 0,
        flexGrow: 1, // Allow list to fill remaining space
        overflowY: 'auto', // Scroll if needed
    },
    // Base styles for all NavLinks
    navLinkBase: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px', // Space between icon and text
        padding: '10px 15px', // Adjusted padding
        marginBottom: '4px', // Tighter spacing
        textDecoration: 'none',
        borderRadius: '6px', // Slightly more rounded
        whiteSpace: 'nowrap', // Prevent text wrapping
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
    },
    // Styles for inactive links
    navLinkInactive: {
        color: 'var(--text-color-secondary)', // Dimmer color for inactive
        backgroundColor: 'transparent',
        fontWeight: 'normal',
    },
    // Styles for the active link
    navLinkActive: {
        color: '#fff', // White text on active
        backgroundColor: 'var(--primary-color)',
        fontWeight: '500', // Medium weight for active
        boxShadow: '0 2px 5px rgba(24, 144, 255, 0.2)', // Subtle shadow for active
    },
     adminLinkSeparator: { // Optional separator style
         marginTop: '15px',
         paddingTop: '15px',
         borderTop: '1px solid var(--border-color-lighter)', // Use a lighter border
     },
    mainContentWrapper: {
        flex: 1,
        // marginLeft is dynamic
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden', // Prevent layout shifts during transition
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between', // Push left/right content apart
        alignItems: 'center',
        padding: '0 25px', // Vertical padding handled by height
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--header-bg)',
        height: '60px', // Fixed header height
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        flexShrink: 0, // Prevent header shrinking
        zIndex: 50,
    },
    headerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px', // Space between items in the right header
    },
    themeToggleButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '6px', // Slightly larger click area
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-color-secondary)',
        // Removed marginLeft, using gap in headerRight instead
    },
    userMenu: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px', // Use gap for spacing
        padding: '5px 10px',
        borderRadius: '6px',
        cursor: 'default', // Not clickable for now
    },
     userEmail: {
         fontSize: '0.9rem',
         color: 'var(--text-color)', // Use main text color
         fontWeight: 500,
         marginRight: '5px',
     },
     userRole: {
         fontSize: '0.8rem',
         color: 'var(--text-color-secondary)',
         fontStyle: 'italic',
     },
    logoutButton: {
        // marginLeft: '20px', Removed, using gap
        padding: '6px', // Padding for icon button
        border: 'none', // Borderless button
        borderRadius: '50%', // Circular button
        cursor: 'pointer',
        backgroundColor: 'transparent', // Transparent background
        color: 'var(--text-color-secondary)', // Icon color matches theme toggle
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.2s ease, color 0.2s ease',
    },
    contentArea: {
        flex: 1, // Take remaining space
        padding: '25px 30px', // More padding
        overflowY: 'auto', // Allow content scrolling independently
        backgroundColor: 'var(--bg-color)',
        position: 'relative', // Needed for Framer Motion positioning
    },
};

// --- Dynamic CSS (Includes Theme Variables and Hover Effects) ---
const customLayoutStyles = `
    /* Define Theme Variables */
    body.theme-light, :root.theme-light { /* Added :root for broader scope */
        --bg-color: #f4f7f9; /* Lighter grey */
        --sidebar-bg: #ffffff;
        --header-bg: #ffffff;
        --card-bg: #ffffff;
        --modal-bg: #ffffff;
        --text-color: #343a40; /* Darker text */
        --text-color-secondary: #6c757d; /* Grey text */
        --border-color: #dee2e6; /* Lighter border */
        --border-color-lighter: #e9ecef;
        --table-border-color: #dee2e6;
        --table-row-border-color: #e9ecef;
        --table-header-bg: #f8f9fa; /* Very light grey */
        --button-bg: #e9ecef;
        --button-text: #343a40;
        --input-bg: #ffffff;
        --input-border-color: #ced4da;
        --primary-color: #0d6efd; /* Standard Bootstrap blue */
        --hover-bg: #f8f9fa; /* Background for hover states */
        color-scheme: light;
    }
    body.theme-dark, :root.theme-dark {
        --bg-color: #121212; /* Very dark grey */
        --sidebar-bg: #1e1e1e; /* Slightly lighter dark */
        --header-bg: #1e1e1e;
        --card-bg: #1e1e1e;
        --modal-bg: #1e1e1e;
        --text-color: #e0e0e0; /* Off-white */
        --text-color-secondary: #a0a0a0; /* Lighter grey */
        --border-color: #333333; /* Darker border */
        --border-color-lighter: #2a2a2a;
        --table-border-color: #444444;
        --table-row-border-color: #333333;
        --table-header-bg: #2a2a2a;
        --button-bg: #333333;
        --button-text: #e0e0e0;
        --input-bg: #2a2a2a;
        --input-border-color: #444444;
        --primary-color: #3b82f6; /* Brighter blue for dark mode */
        --hover-bg: #2a2a2a;
        color-scheme: dark;
    }

    /* Apply smooth transition globally */
    body, * { /* Apply to all elements for consistency */
         transition: background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
    }
    /* Remove default margins/paddings */
    body, h1, h2, h3, h4, h5, h6, p, ul, ol { margin: 0; padding: 0; }
    ul, ol { list-style: none; }

    /* Apply variables to general elements */
    body { background-color: var(--bg-color); color: var(--text-color); font-size: 14px; }
    h1, h2, h3, h4, h5, h6 { color: var(--text-color); margin-bottom: 0.5em; /* Add some default spacing back */}
    p { color: var(--text-color); margin-bottom: 1em; }
    a { color: var(--primary-color); text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* Theme specific input/select styling */
    input, select, textarea {
       background-color: var(--input-bg);
       border: 1px solid var(--input-border-color);
       color: var(--text-color);
       border-radius: 4px;
       padding: 8px 12px;
    }
    input::placeholder, textarea::placeholder {
       color: var(--text-color-secondary);
       opacity: 0.7;
    }
    input:focus, select:focus, textarea:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb, 13, 110, 253), 0.25); /* Use RGB for shadow */
        outline: none;
    }
     /* Define primary color RGB for box-shadow */
    :root { --primary-color-rgb: 13, 110, 253; }
    :root.theme-dark { --primary-color-rgb: 59, 130, 246; }

    input:disabled, select:disabled, textarea:disabled {
        background-color: var(--button-bg) !important; /* Use button bg for disabled */
        color: var(--text-color-secondary) !important;
        cursor: not-allowed;
        opacity: 0.65;
    }

    /* Scrollbars */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: var(--bg-color); }
    ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--text-color-secondary); }

    /* NavLink Hover Effect */
    nav ul li a:hover { /* Apply hover to base style */
        background-color: var(--hover-bg) !important;
        color: var(--primary-color) !important; /* Make text primary color on hover */
        text-decoration: none; /* Remove underline from NavLink */
    }
     /* Ensure active state overrides hover background */
    nav ul li a[style*="background-color: var(--primary-color)"]:hover {
       background-color: var(--primary-color) !important; /* Keep primary color */
       color: #fff !important; /* Keep white text */
    }


    /* Button Hover Effects */
    button.logout-button:hover,
    button[title="Chuyển chế độ Sáng/Tối"]:hover,
    button[title="Mở rộng"]:hover,
    button[title="Thu gọn"]:hover {
        background-color: var(--hover-bg) !important;
        color: var(--text-color); /* Make icon darker on hover */
    }
`;
export default Layout;