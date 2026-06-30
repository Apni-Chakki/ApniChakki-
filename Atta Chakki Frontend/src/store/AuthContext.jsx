import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const AuthContext = createContext(undefined);

const ADMIN_CREDENTIALS = {
  email: 'admin@gristmill.com',
  password: 'admin123',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const [deliveryPersonnel, setDeliveryPersonnel] = useState([]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  }, [user]);

  const login = async (identifier, password, role) => {
    try {
      // route all logins (admin, customer, delivery) through API
      let loginType = role === 'delivery' ? 'delivery' : 'customer';
      
      const response = await fetch(`${API_BASE_URL}/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: identifier, 
          username: identifier,
          password: password,
          login_type: loginType 
        }),
      });

      const data = await response.json();
      if (data.success) {
        if (data.token) localStorage.setItem('token', data.token);
        // If login was meant for admin, verify the backend returned role=admin
        if (role === 'admin' && data.user.role !== 'admin') {
            return false;
        }
        
        let finalUser = data.user;
        if (role === 'delivery') finalUser = { ...data.user, role: 'delivery' };
        
        setUser(finalUser); 
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login API Error:", error);
      return false;
    }
  };

  const googleLogin = async (accessToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/google_login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: accessToken }),
      });

      const data = await response.json();
      if (data.success) {
        if (data.token) localStorage.setItem('token', data.token);
        setUser(data.user);
        return data.user;
      } else {
        console.error(data.message || "Google login failed");
        return null;
      }
    } catch (error) {
      console.error("Google Login API Error:", error);
      return null;
    }
  };

  const signup = async (name, phone, password, address = '') => {
    try {
      const response = await fetch(`${API_BASE_URL}/register.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, phone: phone, password: password, address: address }),
      });
      const data = await response.json();
      if (data.success) {
        if (data.token) localStorage.setItem('token', data.token);
        setUser(data.user);
        return true;
      }
      return false; 
    } catch (error) {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user'); 
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const addDeliveryPersonnel = () => {};
  const updateDeliveryPersonnel = () => {};
  const deleteDeliveryPersonnel = () => {};

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        googleLogin,
        signup, 
        logout,
        isAuthenticated: !!user,
        deliveryPersonnel,
        addDeliveryPersonnel,
        updateDeliveryPersonnel,
        deleteDeliveryPersonnel,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}




