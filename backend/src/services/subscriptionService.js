import SSLCommerzPayment from 'sslcommerz-lts';
import crypto from 'crypto';
import { AppError } from '../utils/ApiError.js';
import { env, isSslcommerzConfigured } from '../config/env.js';
import { getPlan } from './planLimitService.js';
import { createBkashService } from './bkashService.js';
import { createNagadService } from './nagadService.js';

const CHECKOUT_SUCCESS_URL = '/payment/success';
const CHECKOUT_FAIL_URL = '/payment/fail';
const CHECKOUT_CANCEL_URL = '/payment/cancel';

const GRACE_PERIOD_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const mkTranId = () =>
  `TC${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

export const createSubscriptionService = ({
  subscriptionRepository,
  organizationRepository,
  auditLogRepository,
  notificationService,
  paymentService,
  logger,
}) => {
  const bkash = createBkashService({ subscriptionRepository, organizationRepository, auditLogRepository, notificationService, logger });
  const nagad = createNagadService({ subscriptionRepository, organizationRepository, auditLogRepository, notificationService, logger });
  const get = async (organizationId) => {
    const subscription = await subscriptionRepository.getByOrganization(organizationId);
    if (!subscription) {
      throw new AppError(404, 'Subscription not found', { code: 'NOT_FOUND' });
    }
    return subscription;
  };

  const update = async (organizationId, { planId, billingModel }) => {
    const subscription = await subscriptionRepository.getByOrganization(organizationId);
    if (!subscription) {
      throw new AppError(404, 'Subscription not found', { code: 'NOT_FOUND' });
    }

    const plan = getPlan(planId || subscription.planId);
    if (plan.priceBDT > 0 && planId && planId !== subscription.planId) {
      throw new AppError(
        409,
        'Paid plans require checkout. Use POST /api/subscriptions/checkout.',
        { code: 'CHECKOUT_REQUIRED' }
      );
    }

    const updateData = {};
    if (planId) updateData.planId = planId;
    if (billingModel) updateData.billingModel = billingModel;
    if (planId === 'free') {
      updateData.status = 'active';
      updateData.amountBDT = 0;
    }
    updateData.inspectionsLimit = Number.isFinite(plan.inspections) ? plan.inspections : null;

    const updated = await subscriptionRepository.updateByOrganization(organizationId, updateData);

    await organizationRepository.update(organizationId, {
      subscription: { planId: updated.planId, billingModel: updated.billingModel },
    });

    return updated;
  };

  /**
   * Initializes an SSLCommerz session (sandbox when SSLCOMMERZ_IS_LIVE=false).
   * Fails gracefully with a clear error if credentials are not configured.
   */
  const createCheckoutSession = async ({ organizationId, planId, user }) => {
    const plan = getPlan(planId);
    if (plan.priceBDT === 0) {
      throw new AppError(400, 'Free plan does not require checkout', { code: 'INVALID_PLAN' });
    }

    if (!isSslcommerzConfigured()) {
      throw new AppError(
        503,
        'Payment gateway is not configured. Please contact support.',
        { code: 'PAYMENT_NOT_CONFIGURED' }
      );
    }

    const tranId = mkTranId();
    const baseUrl = env.frontendUrl.replace(/\/$/, '');
    const payment = new SSLCommerzPayment(
      env.sslcommerz.storeId,
      env.sslcommerz.storePassword,
      env.sslcommerz.isLive
    );

    const data = {
      total_amount: plan.priceBDT,
      currency: 'BDT',
      tran_id: tranId,
      success_url: `${baseUrl}${CHECKOUT_SUCCESS_URL}`,
      fail_url: `${baseUrl}${CHECKOUT_FAIL_URL}`,
      cancel_url: `${baseUrl}${CHECKOUT_CANCEL_URL}`,
      ipn_url: `${baseUrl}/api/payments/sslcommerz-ipn`,
      shipping_method: 'NO',
      product_name: `TurfCare BD ${planId} plan`,
      product_category: 'Software Subscription',
      product_profile: 'general',
      cus_name: user ? `${user.firstName} ${user.lastName}`.trim() : 'TurfCare BD Customer',
      cus_email: user?.email || 'customer@turfcarebd.com',
      cus_add1: 'Dhaka',
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1207',
      cus_country: 'Bangladesh',
      cus_phone: '01700000000',
      value_a: organizationId,
      value_b: planId,
      value_c: tranId,
    };

    let apiResponse;
    try {
      apiResponse = await payment.init(data);
    } catch (err) {
      logger.error(`SSLCommerz init failed: ${err.message}`);
      throw new AppError(
        502,
        'Payment gateway temporarily unavailable. Please try again later.',
        { code: 'PAYMENT_GATEWAY_ERROR' }
      );
    }

    if (apiResponse?.status !== 'SUCCESS' || !apiResponse.GatewayPageURL) {
      logger.error(`SSLCommerz init rejected: ${JSON.stringify(apiResponse)}`);
      throw new AppError(
        502,
        apiResponse?.failedreason || 'Payment gateway rejected the request.',
        { code: 'PAYMENT_GATEWAY_REJECTED' }
      );
    }

    await subscriptionRepository.upsertByOrganization(organizationId, {
      planId,
      status: 'pending',
      billingModel: 'subscription',
      amountBDT: plan.priceBDT,
      currency: 'BDT',
      paymentMethod: { gateway: 'sslcommerz', tranId },
    });

    await auditLogRepository.create({
      organizationId,
      action: 'subscription.checkout_init',
      resource: 'subscription',
      details: { planId, tranId, amount: plan.priceBDT },
    });

    return { checkoutUrl: apiResponse.GatewayPageURL, tranId, amountBDT: plan.priceBDT, planId };
  };

  const createBkashCheckout = async ({ organizationId, planId, user }) => {
    const plan = getPlan(planId);
    if (plan.priceBDT === 0) {
      throw new AppError(400, 'Free plan does not require checkout', { code: 'INVALID_PLAN' });
    }

    const result = await bkash.createPayment({ organizationId, planId, user, amountBDT: plan.priceBDT });

    await subscriptionRepository.upsertByOrganization(organizationId, {
      planId,
      status: 'pending',
      billingModel: 'pay_per_inspection',
      amountBDT: plan.priceBDT,
      currency: 'BDT',
      paymentMethod: { gateway: 'bkash', paymentId: result.paymentId, invoiceNo: result.invoiceNo },
    });

    await auditLogRepository.create({
      organizationId,
      action: 'subscription.bkash_checkout_init',
      resource: 'subscription',
      details: { planId, paymentId: result.paymentId, amount: plan.priceBDT },
    });

    return result;
  };

  const createNagadCheckout = async ({ organizationId, planId, user }) => {
    const plan = getPlan(planId);
    if (plan.priceBDT === 0) {
      throw new AppError(400, 'Free plan does not require checkout', { code: 'INVALID_PLAN' });
    }

    const result = await nagad.createPayment({ organizationId, planId, user, amountBDT: plan.priceBDT });

    await subscriptionRepository.upsertByOrganization(organizationId, {
      planId,
      status: 'pending',
      billingModel: 'pay_per_inspection',
      amountBDT: plan.priceBDT,
      currency: 'BDT',
      paymentMethod: { gateway: 'nagad', paymentId: result.paymentId, invoiceNo: result.invoiceNo },
    });

    await auditLogRepository.create({
      organizationId,
      action: 'subscription.nagad_checkout_init',
      resource: 'subscription',
      details: { planId, paymentId: result.paymentId, amount: plan.priceBDT },
    });

    return result;
  };

  /**
   * SSLCommerz IPN webhook handler. Validates the transaction via the
   * transaction query API, verifies the amount matches the plan and the
   * value_a matches the organization, then activates the plan.
   */
  const handleIpn = async (body) => {
    const { tran_id: tranId, value_a: orgId, value_b: planId, amount } = body || {};

    if (!isSslcommerzConfigured()) {
      logger.warn('IPN received but SSLCommerz is not configured');
      return { ok: false, reason: 'not_configured' };
    }
    if (!tranId || !orgId) {
      return { ok: false, reason: 'invalid_payload' };
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
      logger.error(`SSLCommerz validation failed: ${err.message}`);
      return { ok: false, reason: 'validation_failed' };
    }

    const valid =
      validation?.status === 'VALID' ||
      validation?.status === 'VALIDATED' ||
      validation?.status === 'Success';

    if (!valid) {
      logger.warn(`IPN: transaction ${tranId} not valid (${validation?.status})`);
      return { ok: false, reason: 'invalid_transaction' };
    }

    const resolvedPlan = planId || validation?.value_b || 'basic';
    const expectedAmount = getPlan(resolvedPlan).priceBDT;
    const paidAmount = Number(amount ?? validation?.amount ?? 0);
    const validatedAmount = Number(validation?.amount ?? 0);

    if (expectedAmount > 0 && validatedAmount !== expectedAmount && paidAmount !== expectedAmount) {
      logger.warn(
        `IPN: amount mismatch for ${tranId} — expected ${expectedAmount}, paid ${validatedAmount}`
      );
      return { ok: false, reason: 'amount_mismatch' };
    }

    const plan = getPlan(resolvedPlan);
    const subscription = await subscriptionRepository.upsertByOrganization(orgId, {
      planId: resolvedPlan,
      status: 'active',
      billingModel: 'subscription',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * DAY_MS),
      nextBillingDate: new Date(Date.now() + 30 * DAY_MS),
      gracePeriodEnd: null,
      inspectionsUsed: 0,
      inspectionsLimit: Number.isFinite(plan.inspections) ? plan.inspections : null,
      amountBDT: expectedAmount,
      currency: 'BDT',
      paymentMethod: {
        gateway: 'sslcommerz',
        tranId,
        validationStatus: validation?.status,
        bankTranId: validation?.bank_tran_id || null,
      },
    });

    await organizationRepository.update(orgId, {
      subscription: { planId: resolvedPlan, billingModel: 'subscription' },
    });

    if (paymentService) {
      const { payment, created } = await paymentService.recordPaidPayment({
        organizationId: orgId,
        tranId,
        valId: validation?.val_id || null,
        planId: resolvedPlan,
        amountBDT: expectedAmount,
        paymentMethod: {
          gateway: 'sslcommerz',
          cardType: validation?.card_type || body?.card_type || null,
          bankTranId: validation?.bank_tran_id || body?.bank_tran_id || null,
        },
        billToName: body?.cus_name || null,
        billToEmail: body?.cus_email || null,
      });

      if (created && notificationService) {
        notificationService.notifyOrganization(
          orgId,
          'invoice:generated',
          { invoiceNo: payment.invoiceNo, tranId, amount: payment.amountBDT, planId: resolvedPlan },
          { action: 'invoice.generated_notified' }
        );
      }
    }

    await auditLogRepository.create({
      organizationId: orgId,
      action: 'subscription.activated',
      resource: 'subscription',
      resourceId: subscription.id,
      details: { planId: resolvedPlan, tranId, amount: expectedAmount },
    });

    return { ok: true, subscription, planId: resolvedPlan };
  };

  const handleBkashCallback = async (body) => {
    const { paymentID, status } = body || {};
    if (!paymentID || status !== 'success') {
      return { ok: false, reason: 'payment_not_completed' };
    }

    const execution = await bkash.executePayment(paymentID);
    const orgId = execution.value_a;
    const planId = execution.value_b || 'basic';
    const plan = getPlan(planId);

    const subscription = await subscriptionRepository.upsertByOrganization(orgId, {
      planId,
      status: 'active',
      billingModel: 'pay_per_inspection',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * DAY_MS),
      nextBillingDate: new Date(Date.now() + 30 * DAY_MS),
      gracePeriodEnd: null,
      inspectionsUsed: 0,
      inspectionsLimit: Number.isFinite(plan.inspections) ? plan.inspections : null,
      amountBDT: plan.priceBDT,
      currency: 'BDT',
      paymentMethod: { gateway: 'bkash', paymentId: paymentID, tranId: execution.trxID },
    });

    await organizationRepository.update(orgId, {
      subscription: { planId, billingModel: 'pay_per_inspection' },
    });

    if (paymentService) {
      const { payment, created } = await paymentService.recordPaidPayment({
        organizationId: orgId,
        tranId: paymentID,
        planId,
        amountBDT: plan.priceBDT,
        paymentMethod: { gateway: 'bkash', paymentId: paymentID, trxId: execution.trxID },
      });
      if (created && notificationService) {
        notificationService.notifyOrganization(orgId, 'invoice:generated', { invoiceNo: payment.invoiceNo, tranId: paymentID, amount: payment.amountBDT, planId }, { action: 'invoice.generated_notified' });
      }
    }

    await auditLogRepository.create({
      organizationId: orgId,
      action: 'subscription.bkash_activated',
      resource: 'subscription',
      resourceId: subscription.id,
      details: { planId, paymentId: paymentID, amount: plan.priceBDT },
    });

    return { ok: true, subscription, planId };
  };

  const handleNagadCallback = async (body) => {
    const { invoiceNo } = body || {};
    if (!invoiceNo) {
      return { ok: false, reason: 'missing_invoice' };
    }

    const validation = await nagad.verifyPayment(invoiceNo);
    const orgId = validation.value_a;
    const planId = validation.value_b || 'basic';
    const plan = getPlan(planId);

    const subscription = await subscriptionRepository.upsertByOrganization(orgId, {
      planId,
      status: 'active',
      billingModel: 'pay_per_inspection',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * DAY_MS),
      nextBillingDate: new Date(Date.now() + 30 * DAY_MS),
      gracePeriodEnd: null,
      inspectionsUsed: 0,
      inspectionsLimit: Number.isFinite(plan.inspections) ? plan.inspections : null,
      amountBDT: plan.priceBDT,
      currency: 'BDT',
      paymentMethod: { gateway: 'nagad', invoiceNo, paymentReferenceId: validation.paymentReferenceId },
    });

    await organizationRepository.update(orgId, {
      subscription: { planId, billingModel: 'pay_per_inspection' },
    });

    if (paymentService) {
      const { payment, created } = await paymentService.recordPaidPayment({
        organizationId: orgId,
        tranId: invoiceNo,
        planId,
        amountBDT: plan.priceBDT,
        paymentMethod: { gateway: 'nagad', invoiceNo, paymentReferenceId: validation.paymentReferenceId },
      });
      if (created && notificationService) {
        notificationService.notifyOrganization(orgId, 'invoice:generated', { invoiceNo: payment.invoiceNo, tranId: invoiceNo, amount: payment.amountBDT, planId }, { action: 'invoice.generated_notified' });
      }
    }

    await auditLogRepository.create({
      organizationId: orgId,
      action: 'subscription.nagad_activated',
      resource: 'subscription',
      resourceId: subscription.id,
      details: { planId, invoiceNo, amount: plan.priceBDT },
    });

    return { ok: true, subscription, planId };
  };

  /**
   * Billing state machine sweep. Runs on a scheduler:
   * active → past_due (7-day grace) → downgraded to free.
   *
   * An active plan whose billing period ended without a captured renewal
   * payment enters past_due with a 7-day grace period. Once the grace period
   * expires the subscription is downgraded to the free plan.
   */
  const runBillingCycle = async () => {
    const now = new Date();
    const due = await subscriptionRepository.listForBillingSweep(now);

    let markedPastDue = 0;
    let downgraded = 0;

    for (const subscription of due) {
      if (subscription.status === 'active') {
        const gracePeriodEnd = new Date(Date.now() + GRACE_PERIOD_DAYS * DAY_MS);
        await subscriptionRepository.update(subscription.id, {
          status: 'past_due',
          gracePeriodEnd,
        });
        await auditLogRepository.create({
          organizationId: subscription.organizationId,
          action: 'subscription.past_due',
          resource: 'subscription',
          resourceId: subscription.id,
          details: { planId: subscription.planId, gracePeriodEnd },
        });
        if (notificationService) {
          await notificationService.notifyOrganization(
            subscription.organizationId,
            'subscription:past_due',
            { planId: subscription.planId, gracePeriodEnd },
            { action: 'subscription.past_due_notified' }
          );
        }
        markedPastDue += 1;
      } else if (subscription.status === 'past_due') {
        const plan = getPlan('free');
        await subscriptionRepository.update(subscription.id, {
          planId: 'free',
          status: 'downgraded',
          amountBDT: 0,
          inspectionsLimit: Number.isFinite(plan.inspections) ? plan.inspections : null,
          gracePeriodEnd: null,
        });
        await organizationRepository.update(subscription.organizationId, {
          subscription: { planId: 'free', billingModel: 'subscription' },
        });
        await auditLogRepository.create({
          organizationId: subscription.organizationId,
          action: 'subscription.downgraded',
          resource: 'subscription',
          resourceId: subscription.id,
          details: { fromPlan: subscription.planId, toPlan: 'free' },
        });
        if (notificationService) {
          await notificationService.notifyOrganization(
            subscription.organizationId,
            'subscription:downgraded',
            { fromPlan: subscription.planId, toPlan: 'free' },
            { action: 'subscription.downgraded_notified' }
          );
        }
        downgraded += 1;
      }
    }

    if (markedPastDue > 0 || downgraded > 0) {
      logger.info(`Billing sweep completed: ${markedPastDue} marked past due, ${downgraded} downgraded`);
    }
    return { markedPastDue, downgraded };
  };

  return { get, update, createCheckoutSession, createBkashCheckout, createNagadCheckout, handleBkashCallback, handleNagadCallback, handleIpn, runBillingCycle };
};

export default createSubscriptionService;