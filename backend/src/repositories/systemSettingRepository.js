import { prisma } from '../config/db.js';
import { createBaseRepository } from './baseRepository.js';

export const systemSettingRepository = {
  ...createBaseRepository(prisma, 'SystemSetting'),

  get: async (key, fallback = null) => {
    const row = await prisma.systemSetting.findUnique({ where: { key } });
    return row ? row.value : fallback;
  },

  set: async (key, value) => {
    const row = await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return row.value;
  },
};

export default systemSettingRepository;