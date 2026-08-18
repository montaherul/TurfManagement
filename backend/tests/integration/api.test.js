/**
 * Integration tests Ã¢â‚¬â€ require TEST_DATABASE_URL pointing at an isolated
 * PostgreSQL database (see AGENTS.md rule 58). The schema must be applied
 * beforehand: `TEST_DATABASE_URL=... npx prisma db push`.
 */
jest.mock('../../src/config/env.js', () => ({
  env: {
    nodeEnv: 'test',
    port: 0,
    databaseUrl: process.env.TEST_DATABASE_URL,
    jwtSecret: process.env.TEST_JWT_SECRET || 'test-jwt-secret',
    jwtRefreshSecret: process.env.TEST_JWT_SECRET || 'test-jwt-refresh-secret',
    frontendUrl: 'http://localhost:5173',
    rateLimit: { max: 10000, windowMs: 60000 },
    uploadDir: './uploads',
    sslcommerz: { storeId: '', storePassword: '', isLive: false },
    sendgrid: { apiKey: '', fromEmail: 'no-reply@turfcarebd.com' },
    isProduction: false,
  },
  isSslcommerzConfigured: () => false,
  isSendgridConfigured: () => false,
}));

jest.mock('../../src/utils/logger.js', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/db.js';

const PASSWORD = 'Password123!';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 10);

const seed = async () => {
  await prisma.auditLog.deleteMany({});
  await prisma.workOrder.deleteMany({});
  await prisma.inspection.deleteMany({});
  await prisma.field.deleteMany({});
  await prisma.userPermission.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.organization.deleteMany({});

  const orgA = await prisma.organization.create({
    data: { name: 'Org A', slug: 'org-a-test' },
  });
  const orgB = await prisma.organization.create({
    data: { name: 'Org B', slug: 'org-b-test' },
  });

  await prisma.subscription.create({
    data: { organizationId: orgA.id, planId: 'free', status: 'active' },
  });

  const adminA = await prisma.user.create({
    data: {
      organizationId: orgA.id,
      email: 'admin-a@test.dev',
      passwordHash: PASSWORD_HASH,
      firstName: 'Admin',
      lastName: 'A',
      role: 'org_admin',
    },
  });
  const inspectorA = await prisma.user.create({
    data: {
      organizationId: orgA.id,
      email: 'inspector-a@test.dev',
      passwordHash: PASSWORD_HASH,
      firstName: 'Inspector',
      lastName: 'A',
      role: 'inspector',
    },
  });
  const viewerB = await prisma.user.create({
    data: {
      organizationId: orgB.id,
      email: 'viewer-b@test.dev',
      passwordHash: PASSWORD_HASH,
      firstName: 'Viewer',
      lastName: 'B',
      role: 'viewer',
    },
  });

  const fieldA = await prisma.field.create({
    data: {
      organizationId: orgA.id,
      fieldId: 'FLD-A-001',
      name: 'Main Pitch',
      sportType: 'football',
      location: { address: 'Dhaka' },
      dimensions: { width: 68, length: 105, unit: 'm' },
      status: 'active',
    },
  });

  return { orgA, orgB, adminA, inspectorA, viewerB, fieldA };
};

describe('TurfCare BD API Ã¢â‚¬â€ integration (auth, tenant isolation, inspection workflow)', () => {
  let app;
  let ctx;

  const login = async (email) => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    expect(res.body.success).toBe(true);
    return res.body.data.accessToken;
  };

  const auth = (token) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = createApp({ redis: null });
    ctx = await seed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects login with a wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin-a@test.dev', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('logs in successfully and exposes /me', async () => {
    const token = await login('admin-a@test.dev');
    const me = await request(app).get('/api/auth/me').set(auth(token)).expect(200);
    expect(me.body.data.user.email).toBe('admin-a@test.dev');
    expect(me.body.data.user.organizationId).toBe(ctx.orgA.id);
  });

  it('blocks cross-tenant access to another organization field', async () => {
    const orgBField = await prisma.field.create({
      data: {
        organizationId: ctx.orgB.id,
        fieldId: 'FLD-B-001',
        name: 'Org B Pitch',
        sportType: 'football',
        location: { address: 'Chittagong' },
        dimensions: { width: 68, length: 105, unit: 'm' },
        status: 'active',
      },
    });

    const token = await login('admin-a@test.dev');
    const res = await request(app)
      .get(`/api/fields/${orgBField.id}`)
      .set(auth(token));
    expect(res.status).toBe(404);
  });

  it('returns 401 without a token and 403 without permission', async () => {
    const res = await request(app).get('/api/fields');
    expect(res.status).toBe(401);

    const viewerToken = await login('viewer-b@test.dev');
    const forbidden = await request(app)
      .post('/api/inspections')
      .set(auth(viewerToken))
      .send({ fieldId: ctx.fieldA.id });
    expect(forbidden.status).toBe(403);
  });

  it('creates a poor inspection that auto-generates a task-specific work order', async () => {
    const token = await login('inspector-a@test.dev');
    const res = await request(app)
      .post('/api/inspections')
      .set(auth(token))
      .send({
        fieldId: ctx.fieldA.id,
        surfaceAssessment: {
          grassCoverPercent: 30,
          colorUniformity: 1,
          weedPresence: 'high',
          pestDamage: 'high',
          diseaseSigns: 'medium',
        },
        soilAssessment: { moistureContent: 90, compactionKgCm2: 25, ph: 9 },
        structuralAssessment: { surfaceEvennessMm: 15, drainageRateMinutes: 40, thatchDepthMm: 14 },
        grassHealth: { colorRating: 1, diseaseRating: 5, pestRating: 4 },
      })
      .expect(201);

    const inspection = res.body.data.inspection;
    expect(inspection.status).toBe('draft');
    expect(inspection.pitchQualityScore.tier).toBe('poor');
    expect(res.body.data.workOrder).toBeTruthy();

    const woRes = await request(app)
      .get(`/api/work-orders/${res.body.data.workOrder.id}`)
      .set(auth(token))
      .expect(200);
    const workOrder = woRes.body.data.workOrder;
    expect(workOrder.priority).toBe('urgent');
    const categories = workOrder.tasks.map((t) => t.category);
    for (const expected of ['drainage', 'aeration', 'thatching', 'overseeding', 'weed_control', 'pest_control', 'disease_treatment', 'irrigation']) {
      expect(categories).toContain(expected);
    }
    expect(workOrder.estimatedCost.amount).toBeGreaterThan(0);
  });

  it('submits, verifies and deletes an inspection through the workflow', async () => {
    const inspectorToken = await login('inspector-a@test.dev');    const created = await request(app)
      .post('/api/inspections')
      .set(auth(inspectorToken))
      .send({ fieldId: ctx.fieldA.id })
      .expect(201);
    const id = created.body.data.inspection.id;

    await request(app).post(`/api/inspections/${id}/submit`).set(auth(inspectorToken)).expect(200);

    const adminToken = await login('admin-a@test.dev');
    await request(app).post(`/api/inspections/${id}/verify`).set(auth(adminToken)).expect(200);

    const verified = await request(app).get(`/api/inspections/${id}`).set(auth(adminToken)).expect(200);
    expect(verified.body.data.inspection.status).toBe('verified');

    await request(app).delete(`/api/inspections/${id}`).set(auth(adminToken)).expect(200);

    const afterDelete = await request(app).get(`/api/inspections/${id}`).set(auth(adminToken));
    expect(afterDelete.status).toBe(404);
  });

  it('rejects deleting another organization work order', async () => {
    const token = await login('admin-a@test.dev');
    const orgBField = await prisma.field.create({
      data: {
        organizationId: ctx.orgB.id,
        fieldId: 'FLD-B-002',
        name: 'Org B Field 2',
        sportType: 'football',
        location: { address: 'Sylhet' },
        dimensions: { width: 68, length: 105, unit: 'm' },
        status: 'active',
      },
    });
    const orgBWo = await prisma.workOrder.create({
      data: {
        organizationId: ctx.orgB.id,
        workOrderId: 'WO-TEST-1',
        fieldId: orgBField.id,
        title: 'Org B maintenance',
        priority: 'high',
        status: 'created',
      },
    });
    const res = await request(app)
      .delete(`/api/work-orders/${orgBWo.id}`)
      .set(auth(token));
    expect(res.status).toBe(404);
  });

  it('updates organization scoring settings and applies them to new scores', async () => {
    const adminToken = await login('admin-a@test.dev');

    const saved = await request(app)
      .put('/api/organizations/me/settings')
      .set(auth(adminToken))
      .send({ scoringWeights: { surface: 10, soil: 10, structural: 10, grass: 10, maintenance: 10 } })
      .expect(200);
    expect(saved.body.data.settings.scoringWeights.surface).toBe(10);

    const created = await request(app)
      .post('/api/inspections')
      .set(auth(adminToken))
      .send({
        fieldId: ctx.fieldA.id,
        surfaceAssessment: { grassCoverPercent: 100, colorUniformity: 5, weedPresence: 'none', pestDamage: 'none', diseaseSigns: 'none' },
        soilAssessment: { moistureContent: 40, compactionKgCm2: 0, ph: 7 },
        structuralAssessment: { surfaceEvennessMm: 0, drainageRateMinutes: 0, thatchDepthMm: 0 },
        grassHealth: { colorRating: 5, diseaseRating: 1, pestRating: 1 },
      })
      .expect(201);
    expect(created.body.data.inspection.pitchQualityScore.total).toBeLessThanOrEqual(50);

    await request(app)
      .put('/api/organizations/me/settings')
      .set(auth(adminToken))
      .send({ scoringWeights: {} })
      .expect(200);
  });
});
