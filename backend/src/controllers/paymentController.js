import { successResponse } from '../utils/asyncHandler.js';
import { services } from '../config/container.js';

export const createPaymentController = () => {
  const paymentService = services.payments;

  const getInvoice = async (req, res) => {
    const { tranId } = req.params;
    const invoice = await paymentService.getInvoiceByTranId(tranId, req.organizationId);
    return successResponse(res, { invoice });
  };

  const getInvoicePdf = async (req, res) => {
    const { tranId } = req.params;
    const { invoice, organization } = await paymentService.getInvoiceForPdf(tranId, req.organizationId);
    const pdfBuffer = await paymentService.getInvoicePdf({ invoice, organization });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNo}.pdf"`);
    return res.send(pdfBuffer);
  };

  return { getInvoice, getInvoicePdf };
};

export default createPaymentController;
