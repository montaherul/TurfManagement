import { AppError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { getPlan } from './planLimitService.js';

const BKASH_BASE = env.bkash?.sandbox ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta' : 'https://tokenized.pay.bka.sh/v1.2.0-beta';
const BKASH_GRANT_TOKEN = `${BKASH_BASE}/tokenized/checkout/token/grant`;
const BKASH_CREATE = `${BKASH_BASE}/tokenized/checkout/create`;
const BKASH_EXECUTE = `${BKASH_BASE}/tokenized/checkout/execute`;
const BKASH_QUERY = `${BKASH_BASE}/tokenized/checkout/payment/status`;

export const createBkashService = () => {
  const getAccessToken = async () => {
    const key = env.bkash?.appKey;
    const secret = env.bkash?.appSecret;
    if (!key || !secret) {
      throw new AppError(503, 'bKash is not configured', { code: 'PAYMENT_NOT_CONFIGURED' });
    }

    const response = await fetch(BKASH_GRANT_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        app_key: key,
        app_secret: secret,
      }),
    });

    const data = await response.json();
    if (!response.ok || data.statusCode !== '0000') {
      throw new AppError(502, `bKash auth failed: ${data.statusMessage || 'unknown'}`, { code: 'BKASH_AUTH_FAILED' });
    }

    return data.id_token;
  };

  const createPayment = async ({ organizationId, planId, user, amountBDT }) => {
    const token = await getAccessToken();
    const plan = getPlan(planId);
    const invoiceNo = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const merchantInvoiceNumber = invoiceNo;

    const payload = {
      mode: '0011',
      payerReference: user?.phone || '01700000000',
      callbackURL: `${env.frontendUrl.replace(/\/$/, '')}/payment/bkash-callback`,
      amount: String(amountBDT || plan.priceBDT),
      currency: 'BDT',
      intent: 'sale',
      billingAddress: {
        address: 'Dhaka',
        city: 'Dhaka',
        countryCode: 'BD',
      },
      merchantInvoiceNumber,
      value_a: organizationId,
      value_b: planId,
    };

    const response = await fetch(BKASH_CREATE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || data.statusCode !== '0000') {
      throw new AppError(502, `bKash create failed: ${data.statusMessage || 'unknown'}`, { code: 'BKASH_CREATE_FAILED' });
    }

    return {
      paymentId: data.paymentID,
      bkashURL: data.bkashURL,
      invoiceNo: merchantInvoiceNumber,
      amountBDT: amountBDT || plan.priceBDT,
      planId,
      status: 'pending',
    };
  };

  const executePayment = async (paymentId) => {
    const token = await getAccessToken();

    const response = await fetch(`${BKASH_EXECUTE}/${paymentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok || data.statusCode !== '0000') {
      throw new AppError(402, `bKash execute failed: ${data.statusMessage || 'unknown'}`, { code: 'BKASH_EXECUTE_FAILED' });
    }

    return data;
  };

  const queryPayment = async (paymentId) => {
    const token = await getAccessToken();

    const response = await fetch(`${BKASH_QUERY}/${paymentId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok || data.statusCode !== '0000') {
      throw new AppError(402, `bKash query failed: ${data.statusMessage || 'unknown'}`, { code: 'BKASH_QUERY_FAILED' });
    }

    return data;
  };

  return { createPayment, executePayment, queryPayment };
};

export default createBkashService;
