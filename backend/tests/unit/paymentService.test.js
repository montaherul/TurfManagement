jest.mock('../../src/config/env.js', () => ({
  env: {
    nodeEnv: 'test',
    port: 0,
    databaseUrl: 'postgresql://localhost:5432/test',
    redisUrl: 'redis://localhost:6379',
    jwtSecret: 'test-secret',
    jwtRefreshSecret: 'test-refresh-secret',
    frontendUrl: 'http://localhost:5173',
    rateLimit: { max: 1000, windowMs: 60000 },
    uploadDir: './uploads',
    sslcommerz: { storeId: 'test-store', storePassword: 'test-pass', isLive: false },
    sendgrid: { apiKey: '', fromEmail: 'no-reply@test.com' },
    isProduction: false,
  },
  isSslcommerzConfigured: () => true,
  isSendgridConfigured: () => false,
}));

import { createPaymentService } from '../../src/services/paymentService.js';

const makeService = (overrides = {}) => {
  const payments = [];
  const paymentRepository = {
    findByTranId: async (tranId) => payments.find((p) => p.tranId === tranId) || null,
    upsertByTranId: async (tranId, data) => {
      const existing = payments.find((p) => p.tranId === tranId);
      if (existing) {
        Object.assign(existing, data);
        return { payment: existing, created: false };
      }
      const payment = { ...data, tranId, createdAt: new Date() };
      payments.push(payment);
      return { payment, created: true };
    },
    countForYear: async (year) => payments.filter((p) => new Date(p.createdAt).getFullYear() === Number(year)).length,
    ...overrides,
  };
  const organizationRepository = {
    findById: async (id) => ({ id, name: 'Test Org', settings: {} }),
    ...overrides,
  };
  const auditLogRepository = { create: async () => {} };
  const notificationService = { notifyOrganization: async () => {} };
  const logger = { error: jest.fn(), info: jest.fn(), warn: jest.fn() };

  const service = createPaymentService({
    paymentRepository,
    organizationRepository,
    auditLogRepository,
    notificationService,
    logger,
  });

  return { service, paymentRepository, payments };
};

describe('createPaymentService', () => {
  describe('recordPaidPayment', () => {
    it('creates a new paid payment record with an invoice number', async () => {
      const { service, paymentRepository } = makeService();
      jest.spyOn(paymentRepository, 'countForYear').mockResolvedValue(0);

      const result = await service.recordPaidPayment({
        organizationId: 'org-1',
        tranId: 'TXN-1',
        planId: 'basic',
        amountBDT: 2500,
        billToName: 'Acme',
        billToEmail: 'acme@example.com',
      });

      expect(result.created).toBe(true);
      expect(result.payment.status).toBe('paid');
      expect(result.payment.invoiceNo).toMatch(/^INV-\d{4}-\d{5}$/);
      expect(result.payment.planName).toBe('Basic');
      expect(result.payment.billToName).toBe('Acme');
    });

    it('updates an existing payment instead of duplicating', async () => {
      const { service, paymentRepository } = makeService();
      jest.spyOn(paymentRepository, 'countForYear').mockResolvedValue(0);

      await service.recordPaidPayment({
        organizationId: 'org-1',
        tranId: 'TXN-2',
        planId: 'basic',
        amountBDT: 2500,
      });

      const result = await service.recordPaidPayment({
        organizationId: 'org-1',
        tranId: 'TXN-2',
        planId: 'professional',
        amountBDT: 8000,
      });

      expect(result.created).toBe(false);
      expect(result.payment.planId).toBe('professional');
      expect(result.payment.amountBDT).toBe(8000);
    });
  });

  describe('nextInvoiceNo', () => {
    it('generates sequential invoice numbers per year', async () => {
      const { service, paymentRepository } = makeService();
      jest.spyOn(paymentRepository, 'countForYear').mockResolvedValue(2);

      const invoiceNo = await service.nextInvoiceNo();
      expect(invoiceNo).toMatch(/^INV-\d{4}-00003$/);
    });
  });

  describe('getInvoiceByTranId', () => {
    it('returns an existing invoice when it belongs to the org', async () => {
      const { service } = makeService();
      await service.recordPaidPayment({
        organizationId: 'org-1',
        tranId: 'TXN-10',
        planId: 'basic',
        amountBDT: 2500,
      });

      const result = await service.getInvoiceByTranId('TXN-10', 'org-1');
      expect(result.tranId).toBe('TXN-10');
      expect(result.organizationId).toBe('org-1');
    });

    it('throws INVOICE_NOT_FOUND for cross-tenant access', async () => {
      const { service } = makeService();
      await service.recordPaidPayment({
        organizationId: 'org-1',
        tranId: 'TXN-11',
        planId: 'basic',
        amountBDT: 2500,
      });

      await expect(service.getInvoiceByTranId('TXN-11', 'org-2')).rejects.toMatchObject({
        statusCode: 404,
        code: 'INVOICE_NOT_FOUND',
      });
    });
  });

  describe('getInvoiceForPdf', () => {
    it('returns invoice and organization data', async () => {
      const { service } = makeService();
      await service.recordPaidPayment({
        organizationId: 'org-1',
        tranId: 'TXN-20',
        planId: 'basic',
        amountBDT: 2500,
      });

      const result = await service.getInvoiceForPdf('TXN-20', 'org-1');
      expect(result.invoice.tranId).toBe('TXN-20');
      expect(result.organization.name).toBe('Test Org');
    });
  });

  describe('getInvoicePdf', () => {
    it('is exported from the service', async () => {
      const { service } = makeService();
      expect(typeof service.getInvoicePdf).toBe('function');
    });
  });
});
