import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Header.module.css';
import { ThemeContext } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext';
import { FaSun, FaMoon, FaUser, FaEdit, FaSignOutAlt, FaHome, FaInfoCircle, FaHeadset, FaBrain, FaHeart } from 'react-icons/fa';

// Function to check if a path is protected
const isProtectedPath = (path) => {
  return ['/support', '/edit-profile', '/memory-list'].includes(path);
};

const Header = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navRef = useRef(null);
    const hamburgerRef = useRef(null);
    const dropdownRef = useRef(null);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const { currentUser, logout, reloadUser } = useAuth();
    const navigate = useNavigate();

    // Reset dropdown when currentUser changes
    useEffect(() => {
        setDropdownOpen(false);
    }, [currentUser]);

    // Handler for navigation to protected routes
    const handleProtectedNavigation = async (e, path) => {
      if (currentUser && isProtectedPath(path)) {
        e.preventDefault();
        
        try {
          // Reload auth state before navigation
          await reloadUser();
          
          // After reload, check if email is verified
          if (!currentUser.emailVerified) {
            navigate('/login?requireVerification=true');
          } else {
            navigate(path);
          }
        } catch (error) {
          console.error("Error refreshing auth state:", error);
          navigate(path); // Navigate anyway
        }
      }
    };

    const handleClickOutside = (event) => {
        if (
            navRef.current && 
            !navRef.current.contains(event.target) &&
            hamburgerRef.current &&
            !hamburgerRef.current.contains(event.target) &&
            menuOpen
        ) {
            setMenuOpen(false);
        }
        
        // Close dropdown when clicking outside
        if (
            dropdownRef.current &&
            !dropdownRef.current.contains(event.target) &&
            dropdownOpen
        ) {
            setDropdownOpen(false);
        }
    };

    const handleLogout = async (e) => {
        e.preventDefault();
        setDropdownOpen(false);
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error('Failed to log out', error);
        }
    };

    const handleEditProfile = () => {
        setDropdownOpen(false);
        navigate('/edit-profile');
    };

    const toggleDropdown = (e) => {
        e.stopPropagation();
        setDropdownOpen(!dropdownOpen);
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpen, dropdownOpen]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768 && menuOpen) {
                setMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [menuOpen]);

    return (
        <header className={styles.header}>
            <div className={styles.logo} onClick={() => navigate('/')} style={{cursor: 'pointer'}}>TherapyAI</div>

            <nav 
                ref={navRef}
                className={`${styles.nav} ${menuOpen ? styles.open : ''}`}
            >
                <Link to="/" 
                    onClick={() => setMenuOpen(false)} 
                    style={{"--item-index": 0}}
                >
                    <FaHome className={styles.menuIcon} /> Ana Sayfa
                </Link>
                <Link to="/about" 
                    onClick={() => setMenuOpen(false)} 
                    style={{"--item-index": 1}}
                >
                    <FaInfoCircle className={styles.menuIcon} /> Hakkında
                </Link>
                <Link 
                    to="/support" 
                    onClick={(e) => {
                        setMenuOpen(false);
                        handleProtectedNavigation(e, '/support');
                    }}
                    style={{"--item-index": 2}}
                >
                    <FaHeart className={styles.menuIcon} /> Duygusal Destek
                </Link>
                
                {/* Giriş Yap/Profil link in hamburger menu */}
                {currentUser ? (
                    <>
                        <Link to="/memory-list" 
                            onClick={(e) => {
                                setMenuOpen(false);
                                handleProtectedNavigation(e, '/memory-list');
                            }} 
                            style={{"--item-index": 3}}
                            className={styles.mobileOnly}
                        >
                            <FaBrain className={styles.menuIcon} /> Hafıza Listesi
                        </Link>
                        <Link to="/edit-profile" 
                            onClick={(e) => {
                                setMenuOpen(false);
                                handleProtectedNavigation(e, '/edit-profile');
                            }} 
                            style={{"--item-index": 4}}
                            className={styles.mobileOnly}
                        >
                            <FaEdit className={styles.menuIcon} /> Profili Düzenle
                        </Link>
                        <Link to="/" 
                            onClick={(e) => {
                                e.preventDefault();
                                setMenuOpen(false);
                                handleLogout(e);
                            }} 
                            style={{"--item-index": 5}}
                            className={`${styles.mobileOnly} ${styles.logoutLink}`}
                        >
                            <FaSignOutAlt className={styles.menuIcon} /> Çıkış Yap
                        </Link>
                    </>
                ) : (
                    <Link to="/login" 
                        onClick={() => setMenuOpen(false)} 
                        style={{"--item-index": 3}}
                        className={styles.mobileOnly}
                    >
                        <FaUser className={styles.menuIcon} /> Giriş Yap
                    </Link>
                )}
            </nav>

            <div className={styles.actions}>
                <button onClick={toggleTheme} className={styles.themeToggle}>
                    {theme === 'light' ? <FaMoon /> : <FaSun />}
                </button>
                
                {currentUser ? (
                    <div className={styles.profileContainer} ref={dropdownRef}>
                        <div 
                            className={`${styles.profileLink} ${dropdownOpen ? styles.active : ''}`} 
                            onClick={toggleDropdown}
                        >
                            <FaUser />
                        </div>
                        {dropdownOpen && (
                            <div className={styles.profileDropdown}>
                                <div 
                                    className={styles.dropdownItem}
                                    onClick={(e) => {
                                        setDropdownOpen(false);
                                        handleProtectedNavigation(e, '/memory-list');
                                    }}
                                >
                                    <FaBrain /> Hafıza Listesi
                                </div>
                                <div 
                                    className={styles.dropdownItem}
                                    onClick={(e) => {
                                        handleEditProfile();
                                        handleProtectedNavigation(e, '/edit-profile');
                                    }}
                                >
                                    <FaEdit /> Profili Düzenle
                                </div>
                                <div className={styles.dropdownDivider}></div>
                                <div 
                                    className={styles.dropdownItem}
                                    onClick={handleLogout}
                                >
                                    <FaSignOutAlt /> Çıkış Yap
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={styles.authLinks}>
                        <Link to="/login" className={styles.loginLink}>
                            Giriş yap
                        </Link>
                    </div>
                )}

                <div
                    ref={hamburgerRef}
                    className={`${styles.hamburger} ${menuOpen ? styles.open : ''}`}
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </header>
    );
};

export default Header;
