/**
 * Authentication Context
 * Handles user authentication state, session management, and auto-refresh
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: "landlord" | "tenant";
}

interface Session {
  createdAt: number;
  rememberMe: boolean;
  expiresIn: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  /**
   * Refresh session from server
   */
  const refreshSession = async () => {
    try {
      const response = await fetch("/api/auth/session", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setSession(data.session);
        // Also update localStorage for backward compatibility
        localStorage.setItem("rentease_user", JSON.stringify(data.user));
      } else {
        // Session expired or invalid
        setUser(null);
        setSession(null);
        localStorage.removeItem("rentease_user");
        localStorage.removeItem("currentUser");
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
      setUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login user
   */
  const login = async (
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: "Login failed",
          description: error.error || "Invalid credentials",
          variant: "destructive",
        });
        return false;
      }

      const data = await response.json();
      setUser(data.user);
      setSession(data.session);
      // Also save to localStorage for backward compatibility
      localStorage.setItem("rentease_user", JSON.stringify(data.user));

      toast({
        title: "Welcome back!",
        description: `Successfully signed in as ${data.user.role}`,
      });

      return true;
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear state regardless of API response
      setUser(null);
      setSession(null);
      localStorage.removeItem("rentease_user");
      localStorage.removeItem("currentUser");
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      
      setLocation("/signin");
    }
  };

  /**
   * Auto-refresh session on mount and periodically
   */
  useEffect(() => {
    refreshSession();

    // Refresh session every 5 minutes to keep it alive
    const interval = setInterval(() => {
      if (user) {
        refreshSession();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  /**
   * Handle session expiration from API responses
   */
  useEffect(() => {
    const handleUnauthorized = (event: CustomEvent) => {
      if (event.detail?.sessionExpired) {
        setUser(null);
        setSession(null);
        localStorage.removeItem("rentease_user");
        localStorage.removeItem("currentUser");
        
        toast({
          title: "Session expired",
          description: "Please sign in again",
          variant: "destructive",
        });
        
        setLocation("/signin");
      }
    };

    window.addEventListener("session-expired" as any, handleUnauthorized);
    return () => window.removeEventListener("session-expired" as any, handleUnauthorized);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

/**
 * Get user from auth context (for backward compatibility)
 */
export function useCurrentUser() {
  const { user } = useAuth();
  return user;
}
