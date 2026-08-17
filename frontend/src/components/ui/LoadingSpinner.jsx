import { ClipLoader } from 'react-spinners';

const LoadingSpinner = ({ size = 40, color = '#3b82f6', text = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <ClipLoader color={color} size={size} />
      {text && <p className="text-sm text-slate-500">{text}</p>}
    </div>
  );
};

export const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size={60} text="Loading TurfCare BD..." />
  </div>
);

export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="bg-white rounded-2xl shadow-card overflow-hidden">
    <div className="p-6 border-b border-slate-200">
      <div className="h-6 bg-slate-200 rounded w-48 animate-pulse" />
    </div>
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="h-4 bg-slate-200 rounded flex-1 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default LoadingSpinner;