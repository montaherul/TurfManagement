import { XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PaymentFail = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-card max-w-lg w-full p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Payment Failed</h1>
        <p className="text-slate-500 mt-2">We were unable to process your payment. Please try again or contact support.</p>
        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={() => navigate('/settings')}
            className="px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Back to Settings
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFail;
