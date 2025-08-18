import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { applyActionCode, getAuth, reload } from 'firebase/auth';
import styles from './Auth.module.css';

const VerifyEmail = () => {
  const [verificationState, setVerificationState] = useState({
    isVerifying: true,
    isSuccess: false,
    error: null
  });
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

  useEffect(() => {
    document.body.classList.add('auth-page');
    
    // Parse the URL for the action code (oobCode)
    const queryParams = new URLSearchParams(location.search);
    const actionCode = queryParams.get('oobCode');
    
    // If no action code is available, redirect to the login page
    if (!actionCode) {
      setVerificationState({
        isVerifying: false,
        isSuccess: false,
        error: 'Geçersiz veya süresi dolmuş doğrulama bağlantısı.'
      });
      return;
    }
    
    // Verify the email
    const verifyEmail = async () => {
      try {
        await applyActionCode(auth, actionCode);
        
        // Reload the auth state to update emailVerified status
        if (auth.currentUser) {
          await reload(auth.currentUser);
        }
        
        setVerificationState({
          isVerifying: false,
          isSuccess: true,
          error: null
        });
        
        // Automatically redirect to login page after 5 seconds
        setTimeout(() => {
          navigate('/login?emailVerified=true');
        }, 5000);
      } catch (error) {
        setVerificationState({
          isVerifying: false,
          isSuccess: false,
          error: 'E-posta doğrulama işlemi başarısız oldu. Bağlantı geçersiz veya süresi dolmuş olabilir.'
        });
      }
    };
    
    verifyEmail();
    
    return () => {
      document.body.classList.remove('auth-page');
    };
  }, [location, navigate, auth]);

  return (
    <div className={styles.authContainer}>
      <div className={styles.authForm}>
        <h2>E-posta Doğrulama</h2>
        
        {verificationState.isVerifying && (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>E-posta adresiniz doğrulanıyor...</p>
          </div>
        )}
        
        {!verificationState.isVerifying && verificationState.isSuccess && (
          <div className={styles.success}>
            E-posta adresiniz başarıyla doğrulandı! 5 saniye içinde giriş sayfasına yönlendirileceksiniz.
          </div>
        )}
        
        {!verificationState.isVerifying && !verificationState.isSuccess && (
          <div className={styles.error}>
            {verificationState.error}
          </div>
        )}
        
        <div className={styles.authLinks}>
          <Link to="/login">Giriş sayfasına dön</Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail; 