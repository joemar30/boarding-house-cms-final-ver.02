import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PhpAuthProvider, usePhpAuth } from "./contexts/PhpAuthContext";
import { lazy, Suspense } from "react";
import DashboardLayout from "./components/DashboardLayout";
import { DashboardLayoutSkeleton } from "./components/DashboardLayoutSkeleton";
import { AnimatePresence } from "framer-motion";

const Login = lazy(() => import("./pages/Login"));
const TenantDashboard = lazy(() => import("./pages/tenant/Dashboard"));
const TenantComplaints = lazy(() => import("./pages/tenant/Complaints"));
const TenantNotifications = lazy(() => import("./pages/tenant/Notifications"));
const StaffDashboard = lazy(() => import("./pages/staff/Dashboard"));
const StaffTasks = lazy(() => import("./pages/staff/Tasks"));
const StaffNotifications = lazy(() => import("./pages/staff/Notifications"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminComplaints = lazy(() => import("./pages/admin/Complaints"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));

// Protected route wrapper - redirects to login if not authenticated
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, loading } = usePhpAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const roleDashboard = {
      admin: '/admin/dashboard',
      staff: '/staff/dashboard',
      tenant: '/tenant/dashboard',
    }[user.role] ?? '/login';
    return <Redirect to={roleDashboard} />;
  }

  return <>{children}</>;
}

// Home page - redirects based on role
function Home() {
  const { user, loading } = usePhpAuth();

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  const roleDashboard: Record<string, string> = {
    admin: '/admin/dashboard',
    staff: '/staff/dashboard',
    tenant: '/tenant/dashboard',
  };
  return <Redirect to={roleDashboard[user.role] ?? '/login'} />;
}

function Router() {
  const [location] = useLocation();

  return (
    <Suspense fallback={<DashboardLayoutSkeleton />}>
      <AnimatePresence mode="wait">
        <Switch key={location} location={location}>
          <Route path="/" component={Home} />
          <Route path="/login" component={Login} />

          {/* Tenant Routes */}
          <Route path="/tenant/dashboard">
            <ProtectedRoute allowedRoles={['tenant']}>
              <DashboardLayout><TenantDashboard /></DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/tenant/complaints">
            <ProtectedRoute allowedRoles={['tenant']}>
              <DashboardLayout><TenantComplaints /></DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/tenant/notifications">
            <ProtectedRoute allowedRoles={['tenant']}>
              <DashboardLayout><TenantNotifications /></DashboardLayout>
            </ProtectedRoute>
          </Route>

          {/* Staff Routes */}
          <Route path="/staff/dashboard">
            <ProtectedRoute allowedRoles={['staff']}>
              <DashboardLayout><StaffDashboard /></DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/staff/tasks">
            <ProtectedRoute allowedRoles={['staff']}>
              <DashboardLayout><StaffTasks /></DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/staff/notifications">
            <ProtectedRoute allowedRoles={['staff']}>
              <DashboardLayout><StaffNotifications /></DashboardLayout>
            </ProtectedRoute>
          </Route>

          {/* Admin Routes */}
          <Route path="/admin/dashboard">
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardLayout><AdminDashboard /></DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/admin/complaints">
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardLayout><AdminComplaints /></DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/admin/users">
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardLayout><AdminUsers /></DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/admin/analytics">
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardLayout><AdminAnalytics /></DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/admin/settings">
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardLayout><AdminSettings /></DashboardLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </AnimatePresence>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <PhpAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </PhpAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
