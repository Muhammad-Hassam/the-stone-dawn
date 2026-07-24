import { createContext, useContext, useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("pgc_user");
    const token = localStorage.getItem("pgc_token");

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      // Verify the token is still valid / refresh user details in the background
      axiosClient
        .get("/auth/me")
        .then(({ data }) => {
          setUser(data.data);
          localStorage.setItem("pgc_user", JSON.stringify(data.data));
        })
        .catch(() => {
          // interceptor already clears storage & redirects on 401
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await axiosClient.post("/auth/login", { email, password });
    localStorage.setItem("pgc_token", data.data.token);
    localStorage.setItem("pgc_user", JSON.stringify(data.data.user));
    setUser(data.data.user);
    return data.data.user;
  };

  const logout = () => {
    localStorage.removeItem("pgc_token");
    localStorage.removeItem("pgc_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, isAdmin: user?.role === "admin" }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
