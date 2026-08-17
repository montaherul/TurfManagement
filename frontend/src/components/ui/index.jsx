import { useState } from 'react';
import { X, AlertTriangle, Inbox, RefreshCw } from 'lucide-react';

const Button = ({ children, variant = 'primary', size = 'md', loading, disabled, fullWidth, className = '', ...props }) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};

const Input = ({ label, error, className = '', ...props }) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
    )}
    <input
      className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
        error ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'
      }`}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

const Select = ({ label, error, children, className = '', ...props }) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
    )}
    <select
      className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white ${
        error ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'
      }`}
      {...props}
    >
      {children}
    </select>
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

const TextArea = ({ label, error, className = '', ...props }) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
    )}
    <textarea
      className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
        error ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'
      }`}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

const Card = ({ children, className = '', padding = true }) => (
  <div className={`bg-white rounded-2xl shadow-card ${padding ? 'p-6' : ''} ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'default', size = 'md' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
};

const Modal = ({ open, onClose, title, children, footer, width = 'max-w-lg' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${width} max-h-[90vh] flex flex-col animate-slide-up`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
};

const ErrorState = ({ message = 'Something went wrong', onRetry }) => (
  <div className="bg-white rounded-2xl shadow-card p-10 flex flex-col items-center justify-center gap-4 text-center">
    <div className="w-14 h-14 rounded-2xl bg-danger-50 flex items-center justify-center">
      <AlertTriangle className="w-7 h-7 text-danger-500" />
    </div>
    <p className="text-slate-700 font-medium">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    )}
  </div>
);

const EmptyState = ({ title = 'Nothing here yet', description, action }) => (
  <div className="bg-white rounded-2xl shadow-card p-10 flex flex-col items-center justify-center gap-3 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
      <Inbox className="w-7 h-7 text-slate-400" />
    </div>
    <p className="font-semibold text-slate-800">{title}</p>
    {description && <p className="text-sm text-slate-500 max-w-sm">{description}</p>}
    {action}
  </div>
);

export { Button, Input, Select, TextArea, Card, Badge, Modal, ErrorState, EmptyState };