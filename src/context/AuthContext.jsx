import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { api, getToken, setToken as persistToken } from "../lib/api";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [me, setMe] = useState(null);
  const [token, setTokenState] = useState(() => getToken());
  const [ready, setReady] = useState(false);

  const clear = useCallback(() => {
    persistToken(null);
    setTokenState(null);
    setMe(null);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const stored = getToken();
      if (!stored) {
        if (alive) setReady(true);
        return;
      }
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const user = await api.get("/auth/me", { token: stored });
          if (!alive) return;
          setMe(user);
          setTokenState(stored);
          break;
        } catch (err) {
          if (!alive) return;
          if (err?.status === 401 || err?.status === 403) {
            clear();
            break;
          }
          if (attempt === 2) {
            setTokenState(stored);
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [clear]);

  useEffect(() => {
    const onUnauthorized = () => clear();
    window.addEventListener("syc:unauthorized", onUnauthorized);
    return () => window.removeEventListener("syc:unauthorized", onUnauthorized);
  }, [clear]);

  const login = useCallback(async (email, password) => {
    const result = await api.post("/auth/login", { email: email.trim().toLowerCase(), password });
    persistToken(result.token);
    setTokenState(result.token);
    setMe(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const result = await api.post("/auth/register", {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
    persistToken(result.token);
    setTokenState(result.token);
    setMe(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    api.post("/auth/logout").catch(() => {});
    clear();
  }, [clear]);

  const updateMe = useCallback((patch) => {
    setMe((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const refreshMe = useCallback(async () => {
    const user = await api.get("/auth/me");
    setMe(user);
    return user;
  }, []);

  const value = useMemo(
    () => ({
      me,
      meId: me?.id || null,
      token,
      ready,
      isAdmin: me?.role === "admin",
      login,
      register,
      logout,
      updateMe,
      refreshMe,
    }),
    [me, token, ready, login, register, logout, updateMe, refreshMe]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
