import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { fetchCurrentUser } from './store/slices/authSlice';
import { fetchCatalog, fetchMyPermissions } from './store/slices/permissionsSlice';

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const Fields = lazy(() => import('./pages/fields/Fields'));
const FieldDetail = lazy(() => import('./pages/fields/FieldDetail'));
const Inspections = lazy(() => import('./pages/inspections/Inspections'));
const InspectionDetail = lazy(() => import('./pages/inspections/InspectionDetail'));
const NewInspection = lazy(() => import('./pages/inspections/NewInspection'));
const WorkOrders = lazy(() => import('./pages/workorders/WorkOrders'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const Team = lazy(() => import('./pages/team/Team'));
const AdminPanel = lazy(() => import('./pages/admin/AdminPanel'));
const Settings = lazy(() => import('./pages/settings/Settings'));
const PaymentSuccess = lazy(() => import('./pages/payment/PaymentSuccess'));
const PaymentFail = lazy(() => import('./pages/payment/PaymentFail'));
const PaymentCancel = lazy(() => import('./pages/payment/PaymentCancel'));
const Invoice = lazy(() => import('./pages/payment/Invoice'));

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const RoleRoute = ({ roles, children }) => {
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth);
  if (!roles.includes(user?.role)) {
    if (isAuthenticated && !user && loading) {
      return <LoadingSpinner text="Loading profile…" />;
    }
    return <Navigate to="/" replace />;
  }
  return children;
};

const IndexRoute = () => {
  const { user } = useSelector((state) => state.auth);
  if (user?.role === 'super_admin') {
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
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<IndexRoute />} />
          <Route
            path="fields"
            element={
              <RoleRoute roles={['org_admin', 'inspector', 'viewer']}>
                <Fields />
              </RoleRoute>
            }
          />
          <Route
            path="fields/:id"
            element={
              <RoleRoute roles={['org_admin', 'inspector', 'viewer']}>
                <FieldDetail />
              </RoleRoute>
            }
          />
          <Route
            path="inspections"
            element={
              <RoleRoute roles={['org_admin', 'inspector']}>
                <Inspections />
              </RoleRoute>
            }
          />
          <Route
            path="inspections/new"
            element={
              <RoleRoute roles={['org_admin', 'inspector']}>
                <NewInspection />
              </RoleRoute>
            }
          />
          <Route
            path="inspections/:id"
            element={
              <RoleRoute roles={['org_admin', 'inspector']}>
                <InspectionDetail />
              </RoleRoute>
            }
          />
          <Route
            path="work-orders"
            element={
              <RoleRoute roles={['org_admin', 'inspector', 'viewer']}>
                <WorkOrders />
              </RoleRoute>
            }
          />
          <Route
            path="reports"
            element={
              <RoleRoute roles={['org_admin']}>
                <Reports />
              </RoleRoute>
            }
          />
          <Route
            path="team"
            element={
              <RoleRoute roles={['org_admin']}>
                <Team />
              </RoleRoute>
            }
          />
          <Route
            path="admin"
            element={
              <RoleRoute roles={['super_admin']}>
                <AdminPanel />
              </RoleRoute>
            }
          />
          <Route path="settings" element={<Settings />} />
          <Route path="payment/success" element={<PaymentSuccess />} />
          <Route path="payment/fail" element={<PaymentFail />} />
          <Route path="payment/cancel" element={<PaymentCancel />} />
          <Route path="invoices/:tranId" element={<Invoice />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default App;