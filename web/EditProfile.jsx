import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db } from '../firebase/firebase';
import styles from './EditProfile.module.css';

const EditProfile = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (currentUser) {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setFormData(prev => ({
              ...prev,
              name: userData.name || '',
              email: currentUser.email || ''
            }));
          } else {
            setFormData(prev => ({
              ...prev,
              name: currentUser.displayName || '',
              email: currentUser.email || ''
            }));
          }
        }
      } catch (err) {
        setError('Kullanıcı bilgileri yüklenemedi.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const updateUserProfile = async () => {
    try {
      if (!currentUser) return false;
      
      // Check if the document exists first
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      // Use setDoc with merge option to handle both create and update
      await setDoc(userDocRef, {
        name: formData.name,
        email: currentUser.email,
        updatedAt: new Date(),
        ...(userDoc.exists() ? {} : { createdAt: new Date() }) // Add createdAt only if document doesn't exist
      }, { merge: true });

      // Update Firebase Auth profile
      await updateProfile(currentUser, {
        displayName: formData.name
      });

      return true;
    } catch (err) {
      console.error("Error updating profile:", err);
      return false;
    }
  };

  const updateUserPassword = async () => {
    if (!formData.currentPassword || !formData.newPassword) return true; // Skip if no password provided
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Yeni şifreler eşleşmiyor.');
      return false;
    }

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        formData.currentPassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      
      // Update password
      await updatePassword(currentUser, formData.newPassword);
      
      return true;
    } catch (err) {
      console.error("Error updating password:", err);
      if (err.code === 'auth/wrong-password') {
        setError('Mevcut şifre yanlış.');
      } else {
        setError('Şifre güncellenirken bir hata oluştu.');
      }
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      if (!currentUser) throw new Error('Kullanıcı oturumu bulunamadı');

      // Validate password fields if attempting to change password
      if (formData.newPassword || formData.confirmPassword || formData.currentPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          setError('Yeni şifreler eşleşmiyor.');
          setUpdating(false);
          return;
        }
        
        if (formData.newPassword && !formData.currentPassword) {
          setError('Şifre değiştirmek için mevcut şifrenizi girmelisiniz.');
          setUpdating(false);
          return;
        }
      }

      // Update profile information
      const profileUpdated = await updateUserProfile();
      
      // Update password if provided
      let passwordChanged = true;
      if (formData.newPassword) {
        passwordChanged = await updateUserPassword();
      }

      if (profileUpdated && passwordChanged) {
        setSuccess('Profiliniz başarıyla güncellendi.');
        
        // Clear password fields
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      }
    } catch (err) {
      console.error("Profile update error:", err);
      setError(`Profil güncellenirken bir hata oluştu: ${err.message || 'Bilinmeyen hata'}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className={styles.loading}>Yükleniyor...</div>;

  return (
    <div className={styles.editProfileContainer}>
      <div className={styles.editProfileCard}>
        <h2>Profili Düzenle</h2>
        
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Basic Info Section */}
          <div className={styles.formSection}>
            <h3>Kullanıcı Bilgileri</h3>
            
            <div className={styles.formGroup}>
              <label htmlFor="name">Ad Soyad</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ad Soyad"
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="email">E-posta</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                disabled
                className={styles.disabledInput}
              />
              <small>E-posta adresi değiştirilemez</small>
            </div>
          </div>
          
          {/* Password Section */}
          <div className={styles.formSection}>
            <h3>Şifre Değiştir</h3>
            <div className={styles.formGroup}>
              <label htmlFor="currentPassword">Mevcut Şifre</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Mevcut şifreniz"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="newPassword">Yeni Şifre</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Yeni şifre"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Yeni şifre tekrar"
              />
            </div>
            <small className={styles.passwordNote}>Şifrenizi değiştirmek istemiyorsanız bu alanları boş bırakın.</small>
          </div>
          
          <div className={styles.formActions}>
            <button 
              type="button" 
              className={styles.cancelButton}
              onClick={() => navigate('/')}
            >
              İptal
            </button>
            <button 
              type="submit" 
              className={styles.saveButton}
              disabled={updating}
            >
              {updating ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile; 