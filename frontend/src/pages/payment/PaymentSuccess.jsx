import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader } from 'lucide-react';
import { paymentApi } from '../../services/paymentService';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tranId = searchParams.get('tran_id');
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tranId) {
      setError('Missing transaction ID');
      setLoading(false);
      return;
    }
    paymentApi
      .getInvoice(tranId)
      .then((result) => {
        setInvoice(result.data.invoice);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Invoice not found yet');
        setLoading(false);
      });
  }, [tranId]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-card max-w-lg w-full p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-success-50 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-success-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Payment Successful</h1>
        <p className="text-slate-500 mt-2">Your payment has been received and invoice generated successfully.</p>

        {loading && (
          <div className="mt-6 flex items-center justify-center gap-2 text-slate-500">
            <Loader className="w-5 h-5 animate-spin" />
            Loading invoice...
          </div>
        )}

        {error && !loading && (
          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            {error}
          </div>
        )}

        {invoice && !loading && (
          <div className="mt-6 text-left space-y-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Invoice No.</span>
                <span className="font-medium text-slate-900">{invoice.invoiceNo}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-slate-500">Payment ID</span>
                <span className="font-medium text-slate-900">{invoice.tranId}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-medium text-slate-900">BDT {Number(invoice.amountBDT).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-slate-500">Plan</span>
                <span className="font-medium text-slate-900 capitalize">{invoice.planName || invoice.planId}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-slate-500">Status</span>
                <span className="font-medium text-success-600 capitalize">{invoice.status}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/invoices/${invoice.tranId}`)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                View Invoice
              </button>
              <button
                onClick={() => navigate(`/invoices/${invoice.tranId}`)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Download PDF
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="mt-6 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
