import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Loader } from 'lucide-react';
import { paymentApi } from '../../services/paymentService';

const Invoice = () => {
  const { tranId } = useParams();
  const navigate = useNavigate();
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
        setError(err.response?.data?.message || 'Invoice not found');
        setLoading(false);
      });
  }, [tranId]);

  const handleDownload = async () => {
    if (!tranId) return;
    try {
      const response = await paymentApi.getInvoicePdf(tranId);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoice?.invoiceNo || 'invoice'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download PDF');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-card max-w-lg w-full p-8 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-primary-600 text-sm font-medium">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const paymentMethod = invoice.paymentMethod || {};

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">INVOICE</h1>
              <p className="text-slate-500 text-sm mt-1">{invoice.invoiceNo}</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-success-50 text-success-700 text-sm font-medium capitalize">
              {invoice.status}
            </span>
          </div>

          <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Bill To</p>
              <p className="text-slate-900 font-medium mt-1">{invoice.billToName || '-'}</p>
              <p className="text-slate-500 text-sm">{invoice.billToEmail || '-'}</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Date</span>
                <span className="text-slate-900 font-medium">{new Date(invoice.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Date</span>
                <span className="text-slate-900 font-medium">{new Date(invoice.paidAt || invoice.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method</span>
                <span className="text-slate-900 font-medium capitalize">{paymentMethod.cardType || 'SSLCommerz'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID</span>
                <span className="text-slate-900 font-medium">{invoice.tranId}</span>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 border-t border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium text-center">Qty</th>
                  <th className="pb-2 font-medium text-right">Price</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-3 text-slate-900">TurfCare BD {invoice.planName || invoice.planId} plan - 1 month subscription</td>
                  <td className="py-3 text-center text-slate-600">1</td>
                  <td className="py-3 text-right text-slate-600">BDT {Number(invoice.amountBDT).toLocaleString()}</td>
                  <td className="py-3 text-right text-slate-900 font-medium">BDT {Number(invoice.amountBDT).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="px-8 py-6 border-t border-slate-200 bg-slate-50">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-slate-900">BDT {Number(invoice.amountBDT).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Tax</span>
              <span className="text-slate-900">BDT 0</span>
            </div>
            <div className="flex justify-between text-sm mb-4">
              <span className="text-slate-500">Discount</span>
              <span className="text-slate-900">BDT 0</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span className="text-slate-900">TOTAL</span>
              <span className="text-slate-900">BDT {Number(invoice.amountBDT).toLocaleString()}</span>
            </div>
          </div>

          <div className="px-8 py-6 border-t border-slate-200 text-center text-sm text-slate-500">
            Thank you for your payment! For support contact support@turfcarebd.com
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
