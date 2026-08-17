import express from 'express';
import { services } from '../config/container.js';
import { logger } from '../utils/logger.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createPaymentController } from '../controllers/paymentController.js';

const router = express.Router();
const paymentController = createPaymentController();

router.get('/invoice/:tranId', asyncHandler(paymentController.getInvoice));
router.get('/invoice/:tranId/pdf', asyncHandler(paymentController.getInvoicePdf));

router.post('/sslcommerz-ipn', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const result = await services.subscriptions.handleIpn(req.body || {});
    if (!result.ok) {
      logger.warn(`SSLCommerz IPN rejected: ${result.reason}`);
    }
    res.status(200).send('success');
  } catch (err) {
    logger.error(`SSLCommerz IPN error: ${err.message}`);
    res.status(200).send('success');
  }
});

export default router;
