import { successResponse } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';

export const createSubscriptionController = ({ subscriptionService }) => {
  const getSubscription = async (req, res) => {
    const subscription = await subscriptionService.get(req.organizationId);
    return successResponse(res, { subscription });
  };

  const updateSubscription = async (req, res) => {
    const subscription = await subscriptionService.update(req.organizationId, req.body);
    return successResponse(res, { subscription }, 'Subscription updated successfully');
  };

  const createCheckoutSession = async (req, res) => {
    const session = await subscriptionService.createCheckoutSession({
      organizationId: req.organizationId,
      planId: req.body.planId,
      user: req.user,
    });
    return successResponse(res, session, 'Checkout session created');
  };

  const createBkashCheckout = async (req, res) => {
    const session = await subscriptionService.createBkashCheckout({
      organizationId: req.organizationId,
      planId: req.body.planId,
      user: req.user,
    });
    return successResponse(res, session, 'bKash checkout session created');
  };

  const createNagadCheckout = async (req, res) => {
    const session = await subscriptionService.createNagadCheckout({
      organizationId: req.organizationId,
      planId: req.body.planId,
      user: req.user,
    });
    return successResponse(res, session, 'Nagad checkout session created');
  };

  const handleBkashCallback = async (req, res) => {
    const result = await subscriptionService.handleBkashCallback(req.body || req.query);
    if (!result.ok) {
      return res.redirect(`${env.frontendUrl.replace(/\/$/, '')}/payment/fail?reason=${result.reason}`);
    }
    return res.redirect(`${env.frontendUrl.replace(/\/$/, '')}/payment/success?tran_id=${result.subscription.paymentMethod?.paymentId || result.subscription.id}`);
  };

  const handleNagadCallback = async (req, res) => {
    const result = await subscriptionService.handleNagadCallback(req.body || req.query);
    if (!result.ok) {
      return res.redirect(`${env.frontendUrl.replace(/\/$/, '')}/payment/fail?reason=${result.reason}`);
    }
    return res.redirect(`${env.frontendUrl.replace(/\/$/, '')}/payment/success?tran_id=${result.subscription.paymentMethod?.invoiceNo || result.subscription.id}`);
  };

  return { getSubscription, updateSubscription, createCheckoutSession, createBkashCheckout, createNagadCheckout, handleBkashCallback, handleNagadCallback };
};

export default createSubscriptionController;