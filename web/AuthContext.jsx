import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  reload
} from 'firebase/auth';
import { auth } from '../firebase/firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    const actionCodeSettings = {
      url: 'https://therapyai-production-4230.up.railway.app/change-password',
      handleCodeInApp: true
    };
    return sendPasswordResetEmail(auth, email, actionCodeSettings);
  }

  function updateUserProfile(profileData) {
    return updateProfile(auth.currentUser, profileData);
  }

  function verifyEmail() {
    const actionCodeSettings = {
      url: 'https://therapyai-production-4230.up.railway.app/verify-email',
      handleCodeInApp: true
    };
    return sendEmailVerification(auth.currentUser, actionCodeSettings);
  }
  
  function reloadUser() {
    if (auth.currentUser) {
      return reload(auth.currentUser);
    }
    return Promise.resolve();
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    verifyEmail,
    reloadUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 