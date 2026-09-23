import { createContext, useContext, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuth, setIsAuth] = useState(() => api.isAuthenticated());

  const login = async (token) => {
    localStorage.setItem("api_token", token);
    const res = await api.getApplications();
    if (res.success) {
      setIsAuth(true);
      return { success: true };
    }
    localStorage.removeItem("api_token");
    return { success: false, message: res.message || "Login failed." };
  };

  const logout = () => {
    api.logout();
    setIsAuth(false);
  };

  return (
    <AuthContext.Provider value={{ isAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
