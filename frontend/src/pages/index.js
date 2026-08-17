import { lazy } from 'react';

export const Dashboard = lazy(() => import('../components/dashboard/Dashboard'));
export const Fields = lazy(() => import('./fields/Fields'));
export const FieldDetail = lazy(() => import('./fields/FieldDetail'));
export const Inspections = lazy(() => import('./inspections/Inspections'));
export const InspectionDetail = lazy(() => import('./inspections/InspectionDetail'));
export const NewInspection = lazy(() => import('./inspections/NewInspection'));
export const WorkOrders = lazy(() => import('./workorders/WorkOrders'));
export const Reports = lazy(() => import('./reports/Reports'));
export const AdminPanel = lazy(() => import('./admin/AdminPanel'));
export const Settings = lazy(() => import('./settings/Settings'));
export const PaymentSuccess = lazy(() => import('./payment/PaymentSuccess'));
export const PaymentFail = lazy(() => import('./payment/PaymentFail'));
export const PaymentCancel = lazy(() => import('./payment/PaymentCancel'));
export const Invoice = lazy(() => import('./payment/Invoice'));