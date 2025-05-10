import React, { createContext, useContext, useState, useEffect } from 'react';

// Types for authentication
interface User {
  fid: number;
  username: string;
  displayName: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

// Create context
const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

// Token storage key
const TOKEN_KEY = 'defi-tracker-auth-token';
const USER_KEY = 'defi-tracker-auth-user';

/**
 * Authentication provider component
 */
export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from storage on mount
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const savedToken = localStorage.getItem(TOKEN_KEY);
        const savedUserJson = localStorage.getItem(USER_KEY);
        
        if (savedToken && savedUserJson) {
          const savedUser = JSON.parse(savedUserJson) as User;
          setToken(savedToken);
          setUser(savedUser);
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAuthState();
  }, []);

  // Login function
  const login = (newToken: string, newUser: User) => {
    // Save to state
    setToken(newToken);
    setUser(newUser);
    
    // Save to storage
    try {
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    } catch (error) {
      console.error('Error saving auth state:', error);
    }
  };

  // Logout function
  const logout = () => {
    // Clear state
    setToken(null);
    setUser(null);
    
    // Clear storage
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Error clearing auth state:', error);
    }
  };

  // Context value
  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use auth context
 */
export const useAuth = () => useContext(AuthContext); 