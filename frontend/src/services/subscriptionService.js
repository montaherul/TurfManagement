import api from '../utils/api';
import { createResourceService } from './createResourceService';

export const subscriptionService = {
  ...createResourceService('/subscriptions', {
    noId: true,
    names: {
      list: false,
      get: 'getSubscription',
      create: false,
      update: 'updateSubscription',
      remove: false,
    },
  }),
  createCheckoutSession: async (planId) => {
    const response = await api.post('/subscriptions/checkout', { planId });
    return response.data.data;
  },
};

export default subscriptionService;
