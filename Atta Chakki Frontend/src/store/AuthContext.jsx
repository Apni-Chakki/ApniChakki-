import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const AuthContext = createContext(undefined);

const ADMIN_CREDENTIALS = {
  email: 'admin@gristmill.com',
  password: 'admin123',
};

export function AuthProvider({ children }) {
  // user ko local storage se load kar rahe han
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const [deliveryPersonnel, setDeliveryPersonnel] = useState([]);

  // user ko save kar rahe han local storage me
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // login wala function
  const login = async (identifier, password, role) => {
    if (role === 'customer') {
      try {
        const response = await fetch(`${API_BASE_URL}/login.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            phone: identifier, 
            password: password,
            login_type: 'customer' 
          }),
        });

        const data = await response.json();
        if (data.success) {
          setUser(data.user); 
          return true;
        }
        return false;
      } catch (error) {
        console.error("Login API Error:", error);
        return false;
      }
    }

    // admin login check ho raha hai
    if (role === 'admin') {
      if (identifier === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
        const adminUser = {
          id: 'admin-1',
          name: 'Admin',
          email: ADMIN_CREDENTIALS.email,
          role: 'admin',
        };
        setUser(adminUser);
        return true;
      }
    }
    
    // delivery boy login check ho raha hai
    if (role === 'delivery') {
      try {
        const response = await fetch(`${API_BASE_URL}/login.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            phone: identifier, 
            password: password,
            login_type: 'delivery'
          }),
        });

        const data = await response.json();

        if (data.success) {
          // forcing role to delivery for route guard
          setUser({ ...data.user, role: 'delivery' }); 
          return true;
        } else {
          console.error(data.message || "Invalid credentials");
          return false;
        }
      } catch (error) {
        console.error("Login API Error:", error);
        return false;
      }
    }
    
    return false;
  };

  // google se login karne wala function
  const googleLogin = async (accessToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/google_login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: accessToken }),
      });

      const data = await response.json();
      if (data.success) {
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

  // naya account banane wala function
  const signup = async (name, phone, password, address = '') => {
    try {
      const response = await fetch(`${API_BASE_URL}/register.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, phone: phone, password: password, address: address }),
      });
      const data = await response.json();
      if (data.success) {
        return await login(phone, password, 'customer');
      }
      return false; 
    } catch (error) {
      return false;
    }
  };

  // logout wala function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user'); 
    
    // sab users ko main page ya login pe bhej do kyunke direct admin/delivery login ab band hai
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




