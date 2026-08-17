import api from '../utils/api';

export const paymentApi = {
  getInvoice: (tranId) => api.get(`/payments/invoice/${encodeURIComponent(tranId)}`),
  getInvoicePdf: (tranId) => api.get(`/payments/invoice/${encodeURIComponent(tranId)}/pdf`, { responseType: 'blob' }),
};

export default paymentApi;
