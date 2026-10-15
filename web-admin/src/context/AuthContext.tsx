import React, { createContext, useContext, useEffect, useState } from "react";
import { apiGetMe, apiLogin, User } from "../services/api";
import { socketService } from "../services/socket";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("xpress_admin_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      const storedToken = localStorage.getItem("xpress_admin_token");
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await apiGetMe();
        if (currentUser && currentUser.role === "ADMIN") {
          setUser(currentUser);
          setToken(storedToken);
          socketService.connect(storedToken);
        } else {
          logout();
        }
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    }

    verifyAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await apiLogin(email, pass);
    setUser(res.user);
    setToken(res.token);
    socketService.connect(res.token);
  };

  const logout = () => {
    localStorage.removeItem("xpress_admin_token");
    localStorage.removeItem("xpress_admin_user");
    setUser(null);
    setToken(null);
    socketService.disconnect();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!token && !!user && user.role === "ADMIN",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
