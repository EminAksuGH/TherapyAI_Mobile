import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    sendPasswordResetEmail,
    updatePassword,
    updateProfile,
    sendEmailVerification,
    reload
} from 'firebase/auth';
import { auth } from '../firebase/firebase';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Sign up function
    const signup = async (email, password, displayName) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update the user's display name
        if (displayName) {
            await updateProfile(userCredential.user, {
                displayName: displayName
            });
        }
        
        // Send email verification
        await sendEmailVerification(userCredential.user);
        
        return userCredential;
    };

    // Login function
    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    // Logout function
    const logout = () => {
        return signOut(auth);
    };

    // Reset password function
    const resetPassword = (email) => {
        const actionCodeSettings = {
            url: 'https://therapyai-production-4230.up.railway.app/change-password',
            handleCodeInApp: true
        };
        return sendPasswordResetEmail(auth, email, actionCodeSettings);
    };

    // Update password function
    const updateUserPassword = (newPassword) => {
        return updatePassword(currentUser, newPassword);
    };

    // Update profile function
    const updateUserProfile = (profile) => {
        return updateProfile(currentUser, profile);
    };

    // Resend email verification
    const resendEmailVerification = () => {
        if (currentUser) {
            const actionCodeSettings = {
                url: 'https://therapyai-production-4230.up.railway.app/verify-email',
                handleCodeInApp: true
            };
            return sendEmailVerification(currentUser, actionCodeSettings);
        }
        return Promise.reject(new Error('No user logged in'));
    };

    // Send email verification (for new signups)
    const verifyEmail = () => {
        if (currentUser) {
            const actionCodeSettings = {
                url: 'https://therapyai-production-4230.up.railway.app/verify-email',
                handleCodeInApp: true
            };
            return sendEmailVerification(currentUser, actionCodeSettings);
        }
        return Promise.reject(new Error('No user logged in'));
    };

    // Reload user to get updated email verification status
    const reloadUser = async () => {
        if (currentUser) {
            await reload(currentUser);
            // The onAuthStateChanged listener will automatically update currentUser
            return currentUser;
        }
        return Promise.reject(new Error('No user logged in'));
    };

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
        updateUserPassword,
        updateUserProfile,
        resendEmailVerification,
        verifyEmail,
        reloadUser
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}; 