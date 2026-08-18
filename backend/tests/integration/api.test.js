/**
 * TurfBook integration tests — run against the development database
 * (or TEST_DATABASE_URL when provided). Apply schema first:
 * `npx prisma migrate reset --force` then `npm run db:seed`.
 */
jest.mock('../../src/config/env.js', () => ({
  env: {
    nodeEnv: 'test',
    port: 0,
    databaseUrl: process.env.TEST_DATABASE_URL,
    jwtSecret: process.env.TEST_JWT_SECRET || 'test-jwt-secret',
    jwtRefreshSecret: process.env.TEST_JWT_SECRET || 'test-jwt-refresh-secret',
    frontendUrl: 'http://localhost:5173',
    logLevel: 'error',
    rateLimit: { max: 100000, windowMs: 60000 },
    uploadDir: './uploads',
    sendgrid: { apiKey: '', fromEmail: 'no-reply@turfbook.dev' },
    sms: { provider: '', apiKey: '', senderId: '' },
    schedulers: { enabled: false, slotHour: 0 },
    isProduction: false,
  },
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
const UNIQUE = Date.now().toString().slice(-8);

const seed = async () => {
  await prisma.bookingItem.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.slot.deleteMany({});
  await prisma.resource.deleteMany({});
  await prisma.blacklist.deleteMany({});
  await prisma.userPermission.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.facility.deleteMany({});

  const facility = await prisma.facility.create({
    data: {
      name: 'Integration Facility',
      slug: `integration-facility-${UNIQUE}`,
      status: 'ACTIVE',
      phone: '01710000000',
      address: { city: 'Dhaka', division: 'Dhaka' },
    },
  });

  await prisma.user.createMany({
    data: [
      {
        email: 'admin@test.dev',
        passwordHash: PASSWORD_HASH,
        firstName: 'Admin',
        role: 'platform_admin',
        isActive: true,
      },
      {
        email: 'owner@test.dev',
        passwordHash: PASSWORD_HASH,
        firstName: 'Owner',
        role: 'facility_owner',
        facilityId: facility.id,
        isActive: true,
      },
    ],
  });

  const resource = await prisma.resource.create({
    data: {
      facilityId: facility.id,
      name: 'Test Turf',
      type: 'FOOTBALL',
      basePrice: 1000,
      status: 'ACTIVE',
      scheduleTemplate: {
        startTime: '09:00',
        endTime: '12:00',
        stepMinutes: 60,
        days: [0, 1, 2, 3, 4, 5, 6],
        price: 1000,
        peakRanges: [],
      },
    },
  });

  const day = new Date(Date.now() + 24 * 60 * 60 * 1000);
  day.setUTCHours(0, 0, 0, 0);
  const slots = [];
  for (let h = 9; h < 12; h += 1) {
    slots.push({
      facilityId: facility.id,
      resourceId: resource.id,
      date: day,
      startTime: `${String(h).padStart(2, '0')}:00`,
      endTime: `${String(h + 1).padStart(2, '0')}:00`,
      price: 1000,
      status: 'AVAILABLE',
    });
  }
  await prisma.slot.createMany({ data: slots });

  return { facility, resource, day };
};

describe('TurfBook API — booking lifecycle', () => {
  let app;
  let facility;
  let resource;
  let day;
  let ownerToken;
  let customerToken;

  beforeAll(async () => {
    const seeded = await seed();
    facility = seeded.facility;
    resource = seeded.resource;
    day = seeded.day;

    app = createApp();

    const ownerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@test.dev', password: PASSWORD });
    ownerToken = ownerLogin.body.data.accessToken;
    expect(ownerLogin.status).toBe(200);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects login with a wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@test.dev', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('publishes facilities publicly with resource types', async () => {
    const res = await request(app).get('/api/v1/facilities?search=Integration');
    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBeGreaterThan(0);
    const found = res.body.data.data.find((f) => f.id === facility.id);
    expect(found.resourceTypes).toContain('FOOTBALL');
  });

  it('blocks tenant B from reading tenant A resources', async () => {
    const other = await prisma.facility.create({
      data: {
        name: 'Other Facility',
        slug: `other-facility-${UNIQUE}`,
        status: 'ACTIVE',
      },
    });
    await prisma.user.create({
      data: {
        email: 'other-owner@test.dev',
        passwordHash: PASSWORD_HASH,
        firstName: 'Other',
        role: 'facility_owner',
        facilityId: other.id,
        isActive: true,
      },
    });
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'other-owner@test.dev', password: PASSWORD });
    const otherToken = login.body.data.accessToken;

    const res = await request(app)
      .get(`/api/v1/resources/${resource.id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });

  it('customer OTP login works and creates a booker', async () => {
    const mobile = `017${UNIQUE.slice(0, 8)}`;
    const requestRes = await request(app)
      .post('/api/v1/auth/otp/request')
      .send({ mobile, purpose: 'LOGIN' });
    expect(requestRes.status).toBe(200);
    const code = requestRes.body.data.devCode;

    const verifyRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ mobile, purpose: 'LOGIN', code });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.user.role).toBe('booker');
    customerToken = verifyRes.body.data.accessToken;
  });

  it('customer books an available slot with payment proof', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        resourceId: resource.id,
        date: day.toISOString().slice(0, 10),
        startTime: '10:00',
        endTime: '11:00',
        paymentMethod: 'BKASH',
        transactionId: 'INT-TRX-1',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.booking.status).toBe('PENDING');
    expect(res.body.data.booking.platformFee).toBe(15);
  });

  it('owner sees the pending payment and verifies it -> booking CONFIRMED', async () => {
    const pending = await request(app)
      .get('/api/v1/payments/pending')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(pending.status).toBe(200);
    expect(pending.body.data.payments.length).toBeGreaterThan(0);
    const payment = pending.body.data.payments[0];

    const verified = await request(app)
      .post(`/api/v1/payments/${payment.id}/verify`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(verified.status).toBe(200);
    expect(verified.body.data.booking.status).toBe('CONFIRMED');
  });

  it('owner checks the customer in and completes the booking', async () => {
    const today = await request(app)
      .get(`/api/v1/bookings/today?date=${day.toISOString().slice(0, 10)}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(today.status).toBe(200);
    const booking = today.body.data.bookings[0];
    expect(booking.status).toBe('CONFIRMED');

    const checkIn = await request(app)
      .post(`/api/v1/bookings/${booking.id}/check-in`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(checkIn.status).toBe(200);

    const complete = await request(app)
      .post(`/api/v1/bookings/${booking.id}/complete`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(complete.body.data.booking.status).toBe('COMPLETED');
  });

  it('facility wallet shows collected fees', async () => {
    const res = await request(app)
      .get('/api/v1/payments/wallet')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.wallet.platformFees).toBe(15);
  });

  it('booking cannot be created without payment proof', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        resourceId: resource.id,
        date: day.toISOString().slice(0, 10),
        startTime: '11:00',
        endTime: '12:00',
      });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('unauthenticated access to owner endpoints is rejected', async () => {
    const res = await request(app).get('/api/v1/resources/all');
    expect(res.status).toBe(401);
  });
});