import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { calculatePitchQualityScore } from '../src/utils/scoring.js';

config();

const prisma = new PrismaClient();

const DEMO_ORG_SLUG = 'demo';
const PASSWORD = 'Password123!';

const log = (msg) => console.log(`[seed] ${msg}`);

const hash = async () => bcrypt.hash(PASSWORD, 10);

const clean = async () => {
  const org = await prisma.organization.findUnique({ where: { slug: DEMO_ORG_SLUG } });
  if (org) {
    await prisma.workOrder.deleteMany({ where: { organizationId: org.id } });
    await prisma.inspection.deleteMany({ where: { organizationId: org.id } });
    await prisma.field.deleteMany({ where: { organizationId: org.id } });
    await prisma.subscription.deleteMany({ where: { organizationId: org.id } });
    await prisma.auditLog.deleteMany({ where: { organizationId: org.id } });
    await prisma.user.deleteMany({ where: { organizationId: org.id } });
    await prisma.organization.delete({ where: { id: org.id } });
    log(`Removed existing demo org (${org.id})`);
  }
  await prisma.user.deleteMany({ where: { email: 'superadmin@demo.com' } });
  log('Cleaned previous demo data');
};

const scoreFrom = (assessments) => calculatePitchQualityScore(assessments);

const buildAssessments = (quality) => {
  const q = Math.min(1, Math.max(0, quality));
  const severity = (val) => ({ good: 'none', mid: 'low', poor: 'high' }[val]);

  return {
    weatherConditions: {
      temperatureC: Math.round(18 + q * 10),
      rainfall: severity(q > 0.6 ? 'good' : q > 0.3 ? 'mid' : 'poor'),
      windKmh: Math.round(5 + (1 - q) * 25),
      sky: q > 0.6 ? 'sunny' : q > 0.3 ? 'partly_cloudy' : 'overcast',
    },
    surfaceAssessment: {
      grassCoverPercent: Math.round(45 + q * 55),
      colorUniformity: Math.round(2 + q * 3),
      weedPresence: severity(q > 0.6 ? 'good' : q > 0.3 ? 'mid' : 'poor'),
      pestDamage: severity(q > 0.6 ? 'good' : q > 0.3 ? 'mid' : 'poor'),
      diseaseSigns: severity(q > 0.6 ? 'good' : q > 0.3 ? 'mid' : 'poor'),
    },
    soilAssessment: {
      moistureContent: Math.round(25 + (1 - q) * 60),
      compactionKgCm2: Math.round(6 + (1 - q) * 22),
      ph: Math.round((6.4 + q * 0.8) * 10) / 10,
      drainageRateMinutes: Math.round(5 + (1 - q) * 40),
      organicMatterPercent: Math.round(2 + q * 4),
    },
    structuralAssessment: {
      surfaceEvennessMm: Math.round(3 + (1 - q) * 16),
      drainageRateMinutes: Math.round(5 + (1 - q) * 40),
      thatchDepthMm: Math.round(1 + (1 - q) * 8),
      slopeIssues: severity(q > 0.6 ? 'good' : q > 0.3 ? 'mid' : 'poor'),
      boundaryIssues: severity(q > 0.6 ? 'good' : q > 0.3 ? 'mid' : 'poor'),
    },
    grassHealth: {
      colorRating: Math.round(2 + q * 3),
      densityRating: Math.round(2 + q * 3),
      diseaseRating: Math.round(1 + (1 - q) * 4),
      pestRating: Math.round(1 + (1 - q) * 4),
      recoveryStatus: severity(q > 0.6 ? 'good' : q > 0.3 ? 'mid' : 'poor'),
    },
  };
};

const main = async () => {
  log('Seeding demo data...');
  await clean();

  const passwordHash = await hash();

  // ---- Organization + subscription ----
  const org = await prisma.organization.create({
    data: {
      name: 'Demo Turf Management Co.',
      slug: DEMO_ORG_SLUG,
      address: { street: '12 Gulshan Avenue', city: 'Dhaka', country: 'Bangladesh', postalCode: '1212' },
      primaryContact: { name: 'Demo Admin', phone: '+8801700000000', email: 'org_admin@demo.com' },
      subscription: { planId: 'free' },
      settings: { theme: 'light' },
    },
  });
  log(`Organization created: ${org.slug} (${org.id})`);

  await prisma.subscription.create({
    data: {
      organizationId: org.id,
      planId: 'free',
      status: 'active',
      billingModel: 'subscription',
      inspectionsUsed: 0,
      inspectionsLimit: 10,
      amountBDT: 0,
      currency: 'BDT',
    },
  });

  // ---- Users ----
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@demo.com',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      organizationId: null,
    },
  });
  const orgAdmin = await prisma.user.create({
    data: {
      email: 'org_admin@demo.com',
      passwordHash,
      firstName: 'Rahim',
      lastName: 'Ahmed',
      role: 'org_admin',
      organizationId: org.id,
    },
  });
  const inspector = await prisma.user.create({
    data: {
      email: 'inspector@demo.com',
      passwordHash,
      firstName: 'Karim',
      lastName: 'Uddin',
      role: 'inspector',
      organizationId: org.id,
    },
  });
  const viewer = await prisma.user.create({
    data: {
      email: 'viewer@demo.com',
      passwordHash,
      firstName: 'Fatema',
      lastName: 'Begum',
      role: 'viewer',
      organizationId: org.id,
    },
  });
  log(`Users created: superadmin@demo.com, org_admin@demo.com, inspector@demo.com, viewer@demo.com (password: ${PASSWORD})`);

  // ---- Fields (5) ----
  const dhaka = { lat: 23.8103, lng: 90.4125 };
  const fieldsData = [
    { fieldId: 'FLD-0001', name: 'Mirpur National Cricket Ground', sportType: 'cricket', turfType: 'natural_grass', grassSpecies: 'Bermuda', drainageType: 'surface', gpsCoordinates: { lat: dhaka.lat + 0.05, lng: dhaka.lng - 0.02 } },
    { fieldId: 'FLD-0002', name: 'Banani Football Turf', sportType: 'football', turfType: 'artificial', grassSpecies: null, drainageType: 'subsurface', gpsCoordinates: { lat: dhaka.lat + 0.03, lng: dhaka.lng + 0.04 } },
    { fieldId: 'FLD-0003', name: 'Gulshan Multi-Sport Arena', sportType: 'multi_sport', turfType: 'hybrid', grassSpecies: 'Rye', drainageType: 'sand_channel', gpsCoordinates: { lat: dhaka.lat - 0.02, lng: dhaka.lng + 0.01 } },
    { fieldId: 'FLD-0004', name: 'Dhanmondi Community Cricket Field', sportType: 'cricket', turfType: 'natural_grass', grassSpecies: 'Bermuda', drainageType: 'surface', gpsCoordinates: { lat: dhaka.lat - 0.04, lng: dhaka.lng - 0.03 } },
    { fieldId: 'FLD-0005', name: 'Uttara Football Ground', sportType: 'football', turfType: 'natural_grass', grassSpecies: 'Perennial Ryegrass', drainageType: 'slope', gpsCoordinates: { lat: dhaka.lat + 0.07, lng: dhaka.lng + 0.05 } },
  ];

  const fields = [];
  for (const f of fieldsData) {
    fields.push(
      await prisma.field.create({
        data: {
          ...f,
          organizationId: org.id,
          status: 'active',
          dimensions: { lengthM: 105, widthM: 68, areaSqm: 7140 },
          address: { area: f.name.split(' ')[0], city: 'Dhaka', country: 'Bangladesh' },
          metadata: { seededBy: 'seed.js' },
        },
      })
    );
  }
  log(`Fields created: ${fields.length}`);

  // ---- Inspections (~30 across last 6 months) ----
  const qualities = [0.9, 0.8, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.15, 0.7, 0.6, 0.5];
  const statuses = ['draft', 'submitted', 'verified', 'verified', 'verified', 'submitted', 'verified', 'draft'];
  const now = new Date();
  const inspections = [];
  const perField = [7, 6, 6, 6, 5];

  fields.forEach((field, fi) => {
    for (let n = 0; n < perField[fi]; n++) {
      const monthsAgo = Math.floor((n * 5) / 6);
      const dayOffset = (n * 13) % 28;
      const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 3 + dayOffset, 10, 30);
      if (date > now) continue;

      const quality = qualities[(n + fi * 3) % qualities.length];
      const assessments = buildAssessments(quality);
      const score = scoreFrom(assessments);
      const status = statuses[(n + fi) % statuses.length];
      const verified = status === 'verified' ? orgAdmin.id : null;

      const recommendations = score.tier === 'excellent'
        ? ['Maintain current management schedule']
        : score.tier === 'good'
          ? ['Adjust mowing height by 5mm', 'Monitor irrigation schedule']
          : score.tier === 'acceptable'
            ? ['Core aeration recommended', 'Top dressing with sand', 'Review fertilizer program']
            : ['Urgent: address drainage issues', 'Restore grass cover (overseeding)', 'Soil test before next fertilization'];

      inspections.push({
        organizationId: org.id,
        fieldId: field.id,
        inspectorId: inspector.id,
        inspectionDate: date,
        status,
        verifiedBy: verified,
        verifiedAt: verified ? new Date(date.getTime() + 24 * 60 * 60 * 1000) : null,
        ...assessments,
        pitchQualityScore: score,
        recommendations,
        photographs: [],
      });
    }
  });

  const createdInspections = [];
  for (const insp of inspections) {
    createdInspections.push(await prisma.inspection.create({ data: insp }));
  }
  log(`Inspections created: ${createdInspections.length}`);

  // ---- Field currentScore from latest verified/submitted inspection ----
  for (const field of fields) {
    const latest = createdInspections
      .filter((i) => i.fieldId === field.id && i.status !== 'draft')
      .sort((a, b) => new Date(b.inspectionDate) - new Date(a.inspectionDate))[0];
    if (latest) {
      await prisma.field.update({
        where: { id: field.id },
        data: {
          currentScore: {
            total: latest.pitchQualityScore.total,
            tier: latest.pitchQualityScore.tier,
            lastInspectionDate: latest.inspectionDate,
            inspectionId: latest.id,
          },
        },
      });
    }
  }

  // ---- Work orders (a few statuses + costs) ----
  const woStatuses = [
    { status: 'created', priority: 'urgent', estimated: 15000 },
    { status: 'assigned', priority: 'high', estimated: 8000 },
    { status: 'in_progress', priority: 'medium', estimated: 5000 },
    { status: 'completed', priority: 'high', estimated: 12000, actual: 11800 },
    { status: 'verified', priority: 'low', estimated: 3000, actual: 2850 },
    { status: 'cancelled', priority: 'medium', estimated: 2000 },
  ];

  const workOrders = [];
  for (let i = 0; i < woStatuses.length; i++) {
    const wo = woStatuses[i];
    const field = fields[i % fields.length];
    const relatedInspection = createdInspections.find((x) => x.fieldId === field.id && x.status === 'verified') || createdInspections.find((x) => x.fieldId === field.id);

    const completedDate = wo.status === 'completed' || wo.status === 'verified'
      ? new Date(now.getTime() - (2 + i) * 24 * 60 * 60 * 1000)
      : null;

    workOrders.push(
      await prisma.workOrder.create({
        data: {
          organizationId: org.id,
          workOrderId: `WO-00${i + 1}`,
          fieldId: field.id,
          inspectionId: relatedInspection?.id || null,
          title: `Maintenance required — ${field.name}`,
          description: `Preventive maintenance generated from inspection (${wo.priority} priority).`,
          priority: wo.priority,
          status: wo.status,
          assignedTo: wo.status === 'created' || wo.status === 'cancelled' ? null : inspector.id,
          dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          completedDate,
          estimatedCost: { amount: wo.estimated, currency: 'BDT' },
          actualCost: wo.actual ? { amount: wo.actual, currency: 'BDT' } : null,
          tasks: [
            { description: 'Inspect affected area', category: 'inspection', estimatedHours: 2 },
            { description: 'Perform corrective maintenance', category: 'maintenance', estimatedHours: 6 },
          ],
          notes: `Seeded work order #${i + 1}`,
        },
      })
    );
  }
  log(`Work orders created: ${workOrders.length}`);

  // ---- Audit logs ----
  await prisma.auditLog.createMany({
    data: [
      { organizationId: org.id, userId: orgAdmin.id, action: 'seed.init', resource: 'organization', resourceId: org.id, details: { note: 'Demo dataset seeded' } },
      { organizationId: org.id, userId: superAdmin.id, action: 'seed.complete', resource: 'organization', resourceId: org.id, details: { fields: fields.length, inspections: createdInspections.length, workOrders: workOrders.length } },
    ],
  });

  log('----- SEED SUMMARY -----');
  log(`Org: demo (${org.id})`);
  log(`Users: 4 (org_admin@demo.com / inspector@demo.com / viewer@demo.com / superadmin@demo.com)`);
  log(`Fields: ${fields.length} | Inspections: ${createdInspections.length} | Work orders: ${workOrders.length}`);
  log('Seeding complete.');
};

main()
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });