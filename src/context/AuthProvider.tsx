import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  setPersistence, 
  browserLocalPersistence,
  signOut
} from 'firebase/auth';
import Dexie from 'dexie';
import { auth } from '../firebase';
import { switchDatabase } from '../db/database';
import { FirebaseService } from '../services/FirebaseService';
import { FirestoreRepository } from '../services/FirestoreRepository';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  isOnline: boolean;
  signOutUser: () => Promise<void>;
  loginAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem('isGuestMode') === 'true';
  });
  const [isOnline, setIsOnline] = useState(FirebaseService.isOnline());

  // Monitor network changes
  useEffect(() => {
    const unsubscribeNetwork = FirebaseService.onNetworkChange((online) => {
      setIsOnline(online);
    });
    return () => unsubscribeNetwork();
  }, []);

  // Initialize auth persistence and listen to auth state changes in sequence
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initAuth = async () => {
      try {
        setLoading(true);
        // 1. Enforce local persistence
        await setPersistence(auth, browserLocalPersistence);
      } catch (error) {
        console.error("Error during auth initialization:", error);
      } finally {
        // 2. Setup the auth state observer only after persistence is finalized
        unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (currentUser) {
            // Clear guest localStorage setting but keep the guest database
            localStorage.removeItem('isGuestMode');
            setIsGuest(false);

            // Switch database to dynamic in-memory mode for security & Single Source of Truth
            switchDatabase(currentUser.uid);
            setUser(currentUser);
            
            // Save user profile immediately so that subcollections can pass security rules 'exists()' checks
            try {
              await FirestoreRepository.saveProfile(currentUser.uid, {
                email: currentUser.email,
                displayName: currentUser.displayName
              });
            } catch (e) {
              console.error("Failed to automatically save user profile on login:", e);
            }
            
            // Validate connection to server in parallel as a check
            FirebaseService.validateConnection();
          } else {
            const isGuestMode = localStorage.getItem('isGuestMode') === 'true';
            if (isGuestMode) {
              switchDatabase(null);
              setIsGuest(true);
            } else {
              switchDatabase(null);
              setIsGuest(false);
            }
            setUser(null);
          }
          setLoading(false);
        });
      }
    };

    initAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const loginAsGuest = () => {
    localStorage.setItem('isGuestMode', 'true');
    setIsGuest(true);
    switchDatabase(null);
  };

  const signOutUser = async (): Promise<void> => {
    setLoading(true);
    try {
      localStorage.removeItem('isGuestMode');
      setIsGuest(false);
      await signOut(auth);
    } catch (error) {
      console.error("Sign-out failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isGuest,
      isOnline,
      signOutUser,
      loginAsGuest
    }}>
      {children}
    </AuthContext.Provider>
  );
};
