import { Navigate, Outlet } from "react-router";
import { useAppStore } from "../../store";

interface AuthGuardProps {
  requiredRole?: "Admin" | "Student";
}

export default function AuthGuard({ requiredRole }: AuthGuardProps) {
  const { currentUser } = useAppStore();

  if (!currentUser) {
    // Not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && currentUser.role !== requiredRole) {
    // Logged in but wrong role, redirect to appropriate dashboard
    return <Navigate to={currentUser.role === "Admin" ? "/" : "/user"} replace />;
  }

  return <Outlet />;
}
