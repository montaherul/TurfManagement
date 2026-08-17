import { successResponse } from '../utils/asyncHandler.js';
import { buildInspectionPdf } from '../services/pdfService.js';

export const createInspectionController = ({ inspectionService }) => {
  const getInspections = async (req, res) => {
    const result = await inspectionService.list({
      organizationId: req.organizationId,
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
      search: req.query.search,
      filters: req.query,
    });
    return res.json({ success: true, message: 'Inspections retrieved successfully', ...result });
  };

  const getInspection = async (req, res) => {
    const inspection = await inspectionService.getById(req.params.id);
    return successResponse(res, { inspection });
  };

  const createInspection = async (req, res) => {
    const { inspection, workOrder } = await inspectionService.create({
      ...req.body,
      organizationId: req.organizationId,
      actorId: req.user.userId,
      ipAddress: req.ip,
    });
    return successResponse(
      res,
      { inspection, ...(workOrder && { workOrder }) },
      'Inspection created successfully',
      201
    );
  };

  const updateInspection = async (req, res) => {
    const inspection = await inspectionService.update(req.params.id, req.body, req.organizationId);
    return successResponse(res, { inspection }, 'Inspection updated successfully');
  };

  const submitInspection = async (req, res) => {
    const inspection = await inspectionService.submit(
      req.params.id,
      req.organizationId,
      req.user.userId
    );
    return successResponse(res, { inspection }, 'Inspection submitted for review');
  };

  const verifyInspection = async (req, res) => {
    const inspection = await inspectionService.verify(
      req.params.id,
      req.organizationId,
      req.user.userId
    );
    return successResponse(res, { inspection }, 'Inspection verified successfully');
  };

  const deleteInspection = async (req, res) => {
    const inspection = await inspectionService.remove(req.params.id, req.organizationId);
    return successResponse(res, { inspection }, 'Inspection deleted');
  };

  const generatePDF = async (req, res) => {
    const inspection = await inspectionService.getPdfData(req.params.id);
    const buffer = await buildInspectionPdf(inspection);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="inspection-${inspection.field?.fieldId || inspection.id}.pdf"`
    );
    return res.send(buffer);
  };

  return { getInspections, getInspection, createInspection, updateInspection, submitInspection, verifyInspection, deleteInspection, generatePDF };
};

export default createInspectionController;