import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import type { IUser } from "../../shared";
import { STORAGE_KEYS } from "../lib/storage";

export interface AuthApi {
  login(
    email: string,
    password: string
  ): Promise<{ token: string; user: IUser }>;
  me(): Promise<{ user: IUser }>;
}

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: IUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  api,
  children,
}: {
  api: AuthApi;
  children: ReactNode;
}) {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem(STORAGE_KEYS.token)
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEYS.token);
    if (!storedToken) {
      setLoading(false);
      return;
    }
    const storedUser = localStorage.getItem(STORAGE_KEYS.user);
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setLoading(false);
    }
    api
      .me()
      .then((res) => {
        setUser(res.user);
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(res.user));
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEYS.token);
        localStorage.removeItem(STORAGE_KEYS.user);
        setUser(null);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [api]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      localStorage.setItem(STORAGE_KEYS.token, res.token);
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
    },
    [api]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}