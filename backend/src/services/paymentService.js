import SSLCommerzPayment from 'sslcommerz-lts';
import { AppError } from '../utils/ApiError.js';
import { env, isSslcommerzConfigured } from '../config/env.js';
import { getPlan } from './planLimitService.js';

const pad5 = (n) => String(n).padStart(5, '0');

/**
 * Payment / invoice service. A payment record is created only after the
 * transaction has been verified with the payment provider (SSLCommerz).
 * The frontend never marks a payment as paid on its own.
 */
export const createPaymentService = ({
  paymentRepository,
  organizationRepository,
  auditLogRepository,
  notificationService,
  logger,
}) => {
  const nextInvoiceNo = async () => {
    const year = new Date().getFullYear();
    const count = await paymentRepository.countForYear(year);
    return `INV-${year}-${pad5(count + 1)}`;
  };

  const recordPaidPayment = async ({
    organizationId,
    tranId,
    valId = null,
    planId,
    amountBDT,
    currency = 'BDT',
    paymentMethod = {},
    billToName = null,
    billToEmail = null,
  }) => {
    const plan = getPlan(planId);
    const invoiceNo = await nextInvoiceNo();
    const { payment, created } = await paymentRepository.upsertByTranId(tranId, {
      organizationId,
      invoiceNo,
      valId,
      planId,
      planName: plan.name || planId,
      amountBDT,
      currency,
      status: 'paid',
      paymentMethod,
      billToName,
      billToEmail,
      paidAt: new Date(),
    });
    return { payment, created };
  };

  const verifyWithGateway = async (tranId) => {
    if (!isSslcommerzConfigured()) {
      throw new AppError(404, 'Invoice not found', { code: 'INVOICE_NOT_FOUND' });
    }
    const payment = new SSLCommerzPayment(
      env.sslcommerz.storeId,
      env.sslcommerz.storePassword,
      env.sslcommerz.isLive
    );
    let validation;
    try {
      validation = await payment.transactionQueryByTransactionId({ tran_id: tranId });
    } catch (err) {
      logger.error(`Invoice verification failed for ${tranId}: ${err.message}`);
      throw new AppError(404, 'Invoice not found', { code: 'INVOICE_NOT_FOUND' });
    }
    const valid =
      validation?.status === 'VALID' ||
      validation?.status === 'VALIDATED' ||
      validation?.status === 'Success';
    if (!valid) {
      throw new AppError(404, 'Invoice not found', { code: 'INVOICE_NOT_FOUND' });
    }
    return validation;
  };

  /**
   * Returns a paid invoice for the organization (tenant-scoped).
   * If no record exists yet, verifies the transaction with SSLCommerz first
   * and only then records + returns the invoice.
   */
  const getInvoiceByTranId = async (tranId, organizationId) => {
    const existing = await paymentRepository.findByTranId(tranId);
    if (existing) {
      if (existing.organizationId !== organizationId) {
        throw new AppError(404, 'Invoice not found', { code: 'INVOICE_NOT_FOUND' });
      }
      return existing;
    }

    const validation = await verifyWithGateway(tranId);
    const resolvedPlan = validation.value_b || 'basic';
    const plan = getPlan(resolvedPlan);
    const validatedAmount = Number(validation.amount ?? plan.priceBDT);

    const { payment, created } = await recordPaidPayment({
      organizationId,
      tranId,
      valId: validation.val_id || null,
      planId: resolvedPlan,
      amountBDT: validatedAmount,
      paymentMethod: {
        gateway: 'sslcommerz',
        cardType: validation.card_type || null,
        bankTranId: validation.bank_tran_id || null,
      },
      billToName: validation.cus_name || null,
      billToEmail: validation.cus_email || null,
    });

    await auditLogRepository.create({
      organizationId,
      action: 'invoice.generated',
      resource: 'payment',
      resourceId: payment.id,
      details: { invoiceNo: payment.invoiceNo, tranId, amount: payment.amountBDT, planId: resolvedPlan },
    });

    if (created && notificationService) {
      notificationService.notifyOrganization(
        organizationId,
        'invoice:generated',
        { invoiceNo: payment.invoiceNo, tranId, amount: payment.amountBDT, planId: resolvedPlan },
        { action: 'invoice.generated_notified' }
      );
    }

    return payment;
  };

  const getInvoiceForPdf = async (tranId, organizationId) => {
    const invoice = await getInvoiceByTranId(tranId, organizationId);
    const organization = await organizationRepository.findById(invoice.organizationId);
    return { invoice, organization };
  };

  const getInvoicePdf = async ({ invoice, organization }) => {
    const { buildInvoicePdf } = await import('../utils/pdfService.js');
    return buildInvoicePdf({ invoice, organization });
  };

  return { recordPaidPayment, getInvoiceByTranId, getInvoiceForPdf, getInvoicePdf, nextInvoiceNo };
};

export default createPaymentService;