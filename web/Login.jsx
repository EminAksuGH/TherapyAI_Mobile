import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [emailVerificationState, setEmailVerificationState] = useState({
    needsVerification: false,
    email: ''
  });
  const { login, verifyEmail, currentUser, logout, reloadUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.body.classList.add('auth-page');
    
    // Check URL parameters
    const params = new URLSearchParams(location.search);
    const emailVerified = params.get('emailVerified');
    const requireVerification = params.get('requireVerification');
    
    if (emailVerified === 'true') {
      setMessage('E-posta adresiniz doğrulandı! Şimdi giriş yapabilirsiniz.');
      
      // If the user is already logged in, reload auth state to update emailVerified status
      if (currentUser) {
        const reloadAuthState = async () => {
          try {
            await reloadUser();
          } catch (error) {
            console.error("Error reloading auth state:", error);
          }
        };
        reloadAuthState();
      }
    }
    
    // Handle redirect from protected routes
    if (requireVerification === 'true' && currentUser) {
      setError('E-posta adresiniz doğrulanmadan bu sayfaya erişemezsiniz.');
      setEmailVerificationState({
        needsVerification: true,
        email: currentUser.email
      });
      
      // Log user out to prevent redirect loops
      logout();
    }
    
    return () => {
      document.body.classList.remove('auth-page');
    };
  }, [location, currentUser, logout]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleResendVerification = async () => {
    try {
      setResendLoading(true);
      await verifyEmail();
      setMessage('Doğrulama e-postası tekrar gönderildi. Lütfen gelen kutunuzu kontrol edin.');
      setEmailVerificationState({ needsVerification: false, email: '' });
    } catch (err) {
      setError('Doğrulama e-postası gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return setError('Lütfen e-posta adresine bir \'@\' ekleyin');
    }
  
    try {
      setError('');
      setMessage('');
      setLoading(true);
      const userCredential = await login(formData.email, formData.password);
      
      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        setError('E-posta adresiniz henüz doğrulanmadı. Lütfen önce e-posta adresinizi doğrulayın.');
        setEmailVerificationState({
          needsVerification: true,
          email: formData.email
        });
        return;
      }
      
      navigate('/');
    } catch (err) {
   
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError('Geçersiz e-posta veya parola');
      } else if (err.code === 'auth/invalid-email') {
        setError('Lütfen e-posta adresine bir \'@\' ekleyin');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Çok fazla deneme. Daha sonra tekrar deneyin');
      } else {
        setError('Giriş başarısız');
      }
    
    
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={styles.authContainer}>
      <div className={styles.authForm}>
        <h2>Giriş Yap</h2>
        {error && <div className={styles.error}>{error}</div>}
        {message && <div className={styles.success}>{message}</div>}
        
        {emailVerificationState.needsVerification ? (
          <div className={styles.verificationNotice}>
            <p>E-posta adresiniz ({emailVerificationState.email}) henüz doğrulanmadı.</p>
            <p>Korumalı sayfalara erişim için e-posta doğrulaması gerekmektedir.</p>
            <button 
              onClick={handleResendVerification} 
              className={styles.resendButton}
              disabled={resendLoading}
            >
              {resendLoading ? 'Gönderiliyor...' : 'Doğrulama E-postasını Tekrar Gönder'}
            </button>
            <div className={styles.authLinks}>
              <Link to="/login" onClick={() => setEmailVerificationState({ needsVerification: false, email: '' })}>
                Giriş sayfasına dön
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="email">E-posta</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Parola</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <button 
              type="submit" 
              className={styles.authButton}
              disabled={loading}
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        )}
        
        {!emailVerificationState.needsVerification && (
          <>
            <div className={styles.authLinks}>
              <Link to="/forgot-password">Parolamı Unuttum</Link>
            </div>
            
            <div className={styles.authLinks}>
              Hesabınız yok mu? <Link to="/signup">Kayıt Ol</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login; 