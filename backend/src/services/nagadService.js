import crypto from 'crypto';
import { AppError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { getPlan } from './planLimitService.js';

const NAGAD_BASE = env.nagad?.sandbox ? 'https://sandbox.nagad.com.bd/api' : 'https://api.nagad.com.bd/api';

export const createNagadService = () => {
  const generateSignature = (data, secret) => {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  };

  const createPayment = async ({ organizationId, planId, user, amountBDT }) => {
    const merchantId = env.nagad?.merchantId;
    const secret = env.nagad?.secretKey;
    if (!merchantId || !secret) {
      throw new AppError(503, 'Nagad is not configured', { code: 'PAYMENT_NOT_CONFIGURED' });
    }

    const plan = getPlan(planId);
    const invoiceNo = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const amount = String(amountBDT || plan.priceBDT);

    const payload = {
      merchantId,
      invoiceNo,
      amount,
      currency: 'BDT',
      successUrl: `${env.frontendUrl.replace(/\/$/, '')}/payment/nagad-success`,
      failUrl: `${env.frontendUrl.replace(/\/$/, '')}/payment/nagad-fail`,
      cancelUrl: `${env.frontendUrl.replace(/\/$/, '')}/payment/nagad-cancel`,
      customerMsisdn: user?.phone || '01700000000',
      value_a: organizationId,
      value_b: planId,
    };

    const signature = generateSignature(JSON.stringify(payload), secret);

    const response = await fetch(`${NAGAD_BASE}/dist/checkout/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Signature': signature,
        'X-Application-Id': merchantId,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || data.status !== 'Success') {
      throw new AppError(502, `Nagad create failed: ${data.desc || 'unknown'}`, { code: 'NAGAD_CREATE_FAILED' });
    }

    return {
      paymentId: data.paymentReferenceId || invoiceNo,
      nagadURL: data.paymentUrl,
      invoiceNo,
      amountBDT: amountBDT || plan.priceBDT,
      planId,
      status: 'pending',
    };
  };

  const verifyPayment = async (invoiceNo) => {
    const merchantId = env.nagad?.merchantId;
    const secret = env.nagad?.secretKey;
    if (!merchantId || !secret) {
      throw new AppError(503, 'Nagad is not configured', { code: 'PAYMENT_NOT_CONFIGURED' });
    }

    const payload = { merchantId, invoiceNo };
    const signature = generateSignature(JSON.stringify(payload), secret);

    const response = await fetch(`${NAGAD_BASE}/dist/checkout/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Signature': signature,
        'X-Application-Id': merchantId,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || data.status !== 'Valid') {
      throw new AppError(402, `Nagad validation failed: ${data.desc || 'unknown'}`, { code: 'NAGAD_VALIDATION_FAILED' });
    }

    return data;
  };

  return { createPayment, verifyPayment };
};

export default createNagadService;
