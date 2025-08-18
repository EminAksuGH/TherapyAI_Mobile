import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { currentUser, reloadUser } = useAuth();
  
  // Reload current user to make sure we have the latest emailVerified status
  useEffect(() => {
    const refreshUserStatus = async () => {
      if (currentUser) {
        try {
          await reloadUser();
        } catch (error) {
          console.error("Error refreshing auth state:", error);
        }
      }
    };
    
    refreshUserStatus();
  }, [currentUser, reloadUser]);
  
  // If the user is not authenticated, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if email is verified
  if (!currentUser.emailVerified) {
    // You can redirect to a special page or show a verification required message
    return <Navigate to="/login?requireVerification=true" replace />;
  }
  
  // If the user is authenticated and email is verified, render the child routes
  return <Outlet />;
};

export default ProtectedRoute; 