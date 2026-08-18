import { successResponse } from '../utils/asyncHandler.js';

export const createPaymentController = ({ paymentService }) => {
  const list = async (req, res) => {
    const result = await paymentService.list({
      facilityId: req.facilityId,
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      method: req.query.method,
      search: req.query.search,
      sort: req.query.sort,
    });
    return successResponse(res, result, 'Payments retrieved');
  };

  const pending = async (req, res) => {
    const payments = await paymentService.pendingForFacility(req.facilityId);
    return successResponse(res, { payments, count: payments.length }, 'Pending payments retrieved');
  };

  const wallet = async (req, res) => {
    const summary = await paymentService.wallet(req.facilityId);
    return successResponse(res, { wallet: summary }, 'Wallet summary');
  };

  const verify = async (req, res) => {
    const result = await paymentService.verify({
      facilityId: req.facilityId,
      id: req.params.id,
      verifierId: req.user.userId,
      ipAddress: req.ip,
    });
    return successResponse(res, result, 'Payment verified');
  };

  const reject = async (req, res) => {
    const result = await paymentService.reject({
      facilityId: req.facilityId,
      id: req.params.id,
      verifierId: req.user.userId,
      reason: req.body.reason,
      ipAddress: req.ip,
    });
    return successResponse(res, result, 'Payment rejected');
  };

  return { list, pending, wallet, verify, reject };
};

export default createPaymentController;