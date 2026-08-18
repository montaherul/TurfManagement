import express from 'express';
import { validate } from '../middleware/validate.js';
import { permit } from '../middleware/permission.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { updateSubscriptionSchema, checkoutSchema } from '../validators/subscriptionValidator.js';
import { services } from '../config/container.js';
import { createSubscriptionController } from '../controllers/subscriptionController.js';

const router = express.Router();
const subscriptionController = createSubscriptionController({ subscriptionService: services.subscriptions });

router.get('/', asyncHandler(subscriptionController.getSubscription));
router.put('/', permit('subscription.manage'), validate(updateSubscriptionSchema), asyncHandler(subscriptionController.updateSubscription));
router.post('/checkout', permit('subscription.manage'), validate(checkoutSchema), asyncHandler(subscriptionController.createCheckoutSession));
router.post('/checkout/bkash', permit('subscription.manage'), validate(checkoutSchema), asyncHandler(subscriptionController.createBkashCheckout));
router.post('/checkout/nagad', permit('subscription.manage'), validate(checkoutSchema), asyncHandler(subscriptionController.createNagadCheckout));
router.get('/payment/bkash/callback', asyncHandler(subscriptionController.handleBkashCallback));
router.get('/payment/nagad/callback', asyncHandler(subscriptionController.handleNagadCallback));

export default router;