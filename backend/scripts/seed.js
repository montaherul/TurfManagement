import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/auth.js';

const prisma = new PrismaClient();

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const dateOnly = (d) => {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
};

const timeToMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const buildDaySlots = (resourceId, date, template) => {
  const { startTime, endTime, stepMinutes, peakRanges = [] } = template;
  const slots = [];
  let minutes = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  while (minutes + stepMinutes <= end) {
    const start = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    const endM = minutes + stepMinutes;
    const stop = `${String(Math.floor(endM / 60)).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
    let price = template.price;
    const peak = peakRanges.find((r) => {
      const ps = timeToMinutes(r.start);
      const pe = timeToMinutes(r.end);
      return minutes >= ps && minutes < pe;
    });
    if (peak) price = peak.price;
    slots.push({
      resourceId,
      date,
      startTime: start,
      endTime: stop,
      price,
      status: 'AVAILABLE',
    });
    minutes += stepMinutes;
  }
  return slots;
};

async function main() {
  console.log('Seeding TurfBook development database...');

  const platformAdmin = await prisma.user.upsert({
    where: { email: 'admin@turfbook.dev' },
    update: {},
    create: {
      firstName: 'Platform',
      lastName: 'Admin',
      email: 'admin@turfbook.dev',
      passwordHash: await hashPassword('Admin@12345'),
      mobile: '01800000000',
      role: 'platform_admin',
      isActive: true,
    },
  });
  console.log('platform admin:', platformAdmin.email);

  const facility = await prisma.facility.upsert({
    where: { slug: 'dhanmondi-football-turf' },
    update: {},
    create: {
      name: 'Dhanmondi Football Turf',
      slug: 'dhanmondi-football-turf',
      description: 'Premium 5-a-side football turf in the heart of Dhanmondi.',
      status: 'ACTIVE',
      phone: '01700000000',
      email: 'booking@dhanmondi-turf.dev',
      address: { street: 'House 27, Road 4, Dhanmondi', city: 'Dhaka', division: 'Dhaka' },
      operatingHours: {
        mon: { open: '08:00', close: '23:00' },
        tue: { open: '08:00', close: '23:00' },
        wed: { open: '08:00', close: '23:00' },
        thu: { open: '08:00', close: '23:00' },
        fri: { open: '08:00', close: '23:00' },
        sat: { open: '08:00', close: '23:00' },
        sun: { open: '08:00', close: '23:00' },
      },
      cancellationPolicy: { noticeHours: 24, fullRefundHours: 24, partialRefundPercent: 50 },
    },
  });
  console.log('facility:', facility.name);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@turfbook.dev' },
    update: {},
    create: {
      firstName: 'Demo',
      lastName: 'Facility Owner',
      email: 'owner@turfbook.dev',
      passwordHash: await hashPassword('Owner@12345'),
      mobile: '01711111111',
      role: 'facility_owner',
      facilityId: facility.id,
      isActive: true,
    },
  });
  console.log('facility owner:', owner.email);

  await prisma.user.upsert({
    where: { email: 'manager@turfbook.dev' },
    update: {},
    create: {
      firstName: 'Demo',
      lastName: 'Manager',
      email: 'manager@turfbook.dev',
      passwordHash: await hashPassword('Manager@12345'),
      mobile: '01722222222',
      role: 'manager',
      facilityId: facility.id,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'operator@turfbook.dev' },
    update: {},
    create: {
      firstName: 'Demo',
      lastName: 'Operator',
      email: 'operator@turfbook.dev',
      passwordHash: await hashPassword('Operator@12345'),
      mobile: '01733333333',
      role: 'operator',
      facilityId: facility.id,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { mobile: '01755555555' },
    update: {},
    create: {
      firstName: 'Demo',
      lastName: 'Customer Rahim',
      mobile: '01755555555',
      role: 'booker',
      isActive: true,
    },
  });

  const template = {
    startTime: '08:00',
    endTime: '23:00',
    stepMinutes: 60,
    price: 1500,
    days: [0, 1, 2, 3, 4, 5, 6],
    peakRanges: [
      { start: '19:00', end: '23:00', price: 2200 },
    ],
  };

  const resources = [];
  for (const [name, idx] of [['Main 5v5 Turf', 1], ['Mini 3v3 Turf', 2]]) {
    const resource = await prisma.resource.upsert({
      where: { id: `${facility.id}-${idx}` },
      update: {},
      create: {
        id: `${facility.id}-${idx}`,
        facilityId: facility.id,
        name,
        type: 'FOOTBALL',
        basePrice: template.price,
        status: 'ACTIVE',
        scheduleTemplate: template,
      },
    });
    resources.push(resource);
    console.log('resource:', resource.name);
  }

  const today = dateOnly(new Date());
  for (let dayOffset = 0; dayOffset < 3; dayOffset += 1) {
    const day = new Date(today.getTime() + dayOffset * 86400000);
    for (const resource of resources) {
      const slots = buildDaySlots(resource.id, day, template).map((s) => ({
        ...s,
        facilityId: resource.facilityId,
      }));
      const created = await prisma.slot.createMany({
        data: slots,
        skipDuplicates: true,
      });
      console.log(`slots for ${resource.name} ${day.toISOString().slice(0, 10)}: ${created.count}`);
    }
  }

  await prisma.systemSetting.upsert({
    where: { key: 'platformFee' },
    update: {},
    create: { key: 'platformFee', value: '15' },
  });
  await prisma.systemSetting.upsert({
    where: { key: 'smsProvider' },
    update: {},
    create: { key: 'smsProvider', value: 'none' },
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());