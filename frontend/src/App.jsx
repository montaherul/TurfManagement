import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Layout from './components/layout/Layout';
import PublicLayout from './components/layout/PublicLayout';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { fetchCurrentUser } from './store/slices/authSlice';
import { fetchCatalog, fetchMyPermissions } from './store/slices/permissionsSlice';

const Landing = lazy(() => import('./pages/public/Landing'));
const FacilityPublic = lazy(() => import('./pages/public/FacilityPublic'));
const Login = lazy(() => import('./pages/auth/Login'));
const Apply = lazy(() => import('./pages/auth/Apply'));
const Dashboard = lazy(() => import('./pages/app/Dashboard'));
const Resources = lazy(() => import('./pages/app/Resources'));
const Slots = lazy(() => import('./pages/app/Slots'));
const Bookings = lazy(() => import('./pages/app/Bookings'));
const Payments = lazy(() => import('./pages/app/Payments'));
const Blacklist = lazy(() => import('./pages/app/Blacklist'));
const Settings = lazy(() => import('./pages/app/Settings'));
const Admin = lazy(() => import('./pages/admin/AdminPanel'));

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const RoleRoute = ({ roles, children }) => {
  const { user } = useSelector((state) => state.auth);
  if (!roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const AppRoute = () => {
  const { user } = useSelector((state) => state.auth);
  if (user?.role === 'platform_admin') {
    return <Navigate to="/admin" replace />;
  }
  return <Dashboard />;
};

const App = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      if (!user) {
        dispatch(fetchCurrentUser());
      }
      dispatch(fetchCatalog());
      dispatch(fetchMyPermissions());
    }
  }, [isAuthenticated, user, dispatch]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<Landing />} />
          <Route path="facilities/:slug" element={<FacilityPublic />} />
        </Route>

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/apply" element={<Apply />} />

        {/* Facility / staff application */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AppRoute />} />
          <Route
            path="resources"
            element={
              <RoleRoute roles={['facility_owner', 'manager', 'operator']}>
                <Resources />
              </RoleRoute>
            }
          />
          <Route
            path="slots"
            element={
              <RoleRoute roles={['facility_owner', 'manager', 'operator']}>
                <Slots />
              </RoleRoute>
            }
          />
          <Route
            path="bookings"
            element={
              <RoleRoute roles={['facility_owner', 'manager', 'operator']}>
                <Bookings />
              </RoleRoute>
            }
          />
          <Route
            path="payments"
            element={
              <RoleRoute roles={['facility_owner', 'manager', 'operator']}>
                <Payments />
              </RoleRoute>
            }
          />
          <Route
            path="blacklist"
            element={
              <RoleRoute roles={['facility_owner', 'manager']}>
                <Blacklist />
              </RoleRoute>
            }
          />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Platform admin */}
        <Route
          path="/admin"
          element={
            <RoleRoute roles={['platform_admin']}>
              <Layout />
            </RoleRoute>
          }
        >
          <Route index element={<Admin />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;