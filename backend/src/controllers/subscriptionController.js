import { successResponse } from '../utils/asyncHandler.js';

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

  return { getSubscription, updateSubscription, createCheckoutSession };
};

export default createSubscriptionController;