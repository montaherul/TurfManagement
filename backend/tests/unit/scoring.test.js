import { calculatePitchQualityScore, getScoreTier, normalizeScoringWeights, DEFAULT_SCORING_WEIGHTS } from '../../src/utils/scoring.js';

describe('getScoreTier — tier boundaries', () => {
  it('maps 54 to poor', () => expect(getScoreTier(54)).toBe('poor'));
  it('maps 55 to acceptable', () => expect(getScoreTier(55)).toBe('acceptable'));
  it('maps 69 to acceptable', () => expect(getScoreTier(69)).toBe('acceptable'));
  it('maps 70 to good', () => expect(getScoreTier(70)).toBe('good'));
  it('maps 84 to good', () => expect(getScoreTier(84)).toBe('good'));
  it('maps 85 to excellent', () => expect(getScoreTier(85)).toBe('excellent'));
  it('maps 100 to excellent', () => expect(getScoreTier(100)).toBe('excellent'));
});

describe('calculatePitchQualityScore — moisture branch (bug fix)', () => {
  const base = {
    surfaceAssessment: {
      grassCoverPercent: 90,
      colorUniformity: 4,
      weedPresence: 'none',
      pestDamage: 'none',
      diseaseSigns: 'none',
    },
    soilAssessment: {
      compactionKgCm2: 25,
      ph: 8.5,
    },
    structuralAssessment: {
      surfaceEvennessMm: 3,
      drainageRateMinutes: 8,
      thatchDepthMm: 1,
    },
    grassHealth: {
      colorRating: 5,
      diseaseRating: 1,
      pestRating: 1,
    },
  };

  it('optimal moisture (20-80) yields a higher soil score than dry soil', () => {
    const optimal = calculatePitchQualityScore({
      ...base,
      soilAssessment: { ...base.soilAssessment, moistureContent: 40 },
    });
    const dry = calculatePitchQualityScore({
      ...base,
      soilAssessment: { ...base.soilAssessment, moistureContent: 10 },
    });
    expect(optimal.soilScore).toBeGreaterThan(dry.soilScore);
  });

  it('waterlogged soil (>80) scores lower than optimal moisture', () => {
    const optimal = calculatePitchQualityScore({
      ...base,
      soilAssessment: { ...base.soilAssessment, moistureContent: 40 },
    });
    const waterlogged = calculatePitchQualityScore({
      ...base,
      soilAssessment: { ...base.soilAssessment, moistureContent: 90 },
    });
    expect(optimal.soilScore).toBeGreaterThan(waterlogged.soilScore);
  });

  it('missing moisture content does not crash and is treated as none', () => {
    const result = calculatePitchQualityScore({
      ...base,
      soilAssessment: { ...base.soilAssessment },
    });
    expect(result.soilScore).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });
});

describe('calculatePitchQualityScore — exact tier boundary totals (55 / 70 / 85)', () => {
  const make = (surface, soil, structural, grass) => ({
    surfaceAssessment: surface,
    soilAssessment: soil,
    structuralAssessment: structural,
    grassHealth: grass,
  });

  it('produces exactly 55 -> acceptable', () => {
    const result = calculatePitchQualityScore(
      make(
        { grassCoverPercent: 15, colorUniformity: 1, weedPresence: 'low', pestDamage: 'high', diseaseSigns: 'high' },
        { compactionKgCm2: 30, ph: 8, moistureContent: 90 },
        { surfaceEvennessMm: 10, drainageRateMinutes: 20, thatchDepthMm: 5 },
        { colorRating: 2, diseaseRating: 5, pestRating: 5 }
      )
    );
    expect(result.total).toBe(55);
    expect(result.tier).toBe('acceptable');
  });

  it('produces exactly 70 -> good', () => {
    const result = calculatePitchQualityScore(
      make(
        { grassCoverPercent: 5, colorUniformity: 1, weedPresence: 'none', pestDamage: 'none', diseaseSigns: 'none' },
        { compactionKgCm2: 26, ph: 8, moistureContent: 10 },
        { surfaceEvennessMm: 10, drainageRateMinutes: 20, thatchDepthMm: 5 },
        { colorRating: 2, diseaseRating: 5, pestRating: 5 }
      )
    );
    expect(result.total).toBe(70);
    expect(result.tier).toBe('good');
  });

  it('produces exactly 85 -> excellent', () => {
    const result = calculatePitchQualityScore(
      make(
        { grassCoverPercent: 5, colorUniformity: 1, weedPresence: 'none', pestDamage: 'none', diseaseSigns: 'none' },
        { compactionKgCm2: 0, ph: 7, moistureContent: 90 },
        { surfaceEvennessMm: 5, drainageRateMinutes: 30, thatchDepthMm: 5 },
        { colorRating: 3, diseaseRating: 4, pestRating: 5 }
      )
    );
    expect(result.total).toBe(85);
    expect(result.tier).toBe('excellent');
  });

  it('scores below 55 as poor', () => {
    const result = calculatePitchQualityScore(
      make(
        { grassCoverPercent: 5, colorUniformity: 1, weedPresence: 'high', pestDamage: 'high', diseaseSigns: 'high' },
        { compactionKgCm2: 40, ph: 9.5, moistureContent: 95 },
        { surfaceEvennessMm: 20, drainageRateMinutes: 60, thatchDepthMm: 10 },
        { colorRating: 1, diseaseRating: 5, pestRating: 5 }
      )
    );
    expect(result.total).toBeLessThan(55);
    expect(result.tier).toBe('poor');
  });
});

describe('calculatePitchQualityScore — malformed/empty input does not crash', () => {
  it('handles null and undefined input', () => {
    expect(() => calculatePitchQualityScore(null)).not.toThrow();
    expect(() => calculatePitchQualityScore(undefined)).not.toThrow();
    expect(() => calculatePitchQualityScore()).not.toThrow();
    const result = calculatePitchQualityScore(null);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(['poor', 'acceptable', 'good', 'excellent']).toContain(result.tier);
  });

  it('handles an empty object', () => {
    const result = calculatePitchQualityScore({});
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.surfaceScore).toBeGreaterThanOrEqual(0);
    expect(result.grassScore).toBeGreaterThanOrEqual(0);
  });

  it('handles partial assessments with malformed values', () => {
    const result = calculatePitchQualityScore({
      surfaceAssessment: { grassCoverPercent: 'high', colorUniformity: 'great' },
      soilAssessment: { compactionKgCm2: 'abc', ph: null, moistureContent: -5 },
      structuralAssessment: null,
      grassHealth: { colorRating: 'x' },
    });
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it('handles arrays and primitives defensively', () => {
    expect(() => calculatePitchQualityScore([])).not.toThrow();
    expect(() => calculatePitchQualityScore('nonsense')).not.toThrow();
  });
});

describe('calculatePitchQualityScore — full assessments produce expected tiers', () => {
  it('a well-maintained field scores good or better', () => {
    const result = calculatePitchQualityScore({
      surfaceAssessment: {
        grassCoverPercent: 92,
        colorUniformity: 5,
        weedPresence: 'none',
        pestDamage: 'none',
        diseaseSigns: 'none',
      },
      soilAssessment: { moistureContent: 30, compactionKgCm2: 6, ph: 6.9 },
      structuralAssessment: { surfaceEvennessMm: 2, drainageRateMinutes: 5, thatchDepthMm: 1 },
      grassHealth: { colorRating: 5, diseaseRating: 1, pestRating: 1 },
    });
    expect(['good', 'excellent']).toContain(result.tier);
    expect(result.total).toBeGreaterThanOrEqual(70);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it('a neglected field scores poor', () => {
    const result = calculatePitchQualityScore({
      surfaceAssessment: {
        grassCoverPercent: 35,
        colorUniformity: 1,
        weedPresence: 'high',
        pestDamage: 'high',
        diseaseSigns: 'high',
      },
      soilAssessment: { moistureContent: 90, compactionKgCm2: 30, ph: 9 },
      structuralAssessment: { surfaceEvennessMm: 18, drainageRateMinutes: 45, thatchDepthMm: 9 },
      grassHealth: { colorRating: 1, diseaseRating: 5, pestRating: 5 },
    });
    expect(result.tier).toBe('poor');
    expect(result.total).toBeLessThan(55);
  });

  it('caps the total at the achievable maximum of 95 (5x20 + 15)', () => {
    const result = calculatePitchQualityScore({
      surfaceAssessment: {
        grassCoverPercent: 100,
        colorUniformity: 5,
        weedPresence: 'none',
        pestDamage: 'none',
        diseaseSigns: 'none',
      },
      soilAssessment: { moistureContent: 40, compactionKgCm2: 0, ph: 7 },
      structuralAssessment: { surfaceEvennessMm: 0, drainageRateMinutes: 0, thatchDepthMm: 0 },
      grassHealth: { colorRating: 5, diseaseRating: 1, pestRating: 1 },
    });
    expect(result.total).toBe(95);
  });

  describe('custom organization scoring weights', () => {
    const perfectData = {
      surfaceAssessment: {
        grassCoverPercent: 100,
        colorUniformity: 5,
        weedPresence: 'none',
        pestDamage: 'none',
        diseaseSigns: 'none',
      },
      soilAssessment: { moistureContent: 40, compactionKgCm2: 0, ph: 7 },
      structuralAssessment: { surfaceEvennessMm: 0, drainageRateMinutes: 0, thatchDepthMm: 0 },
      grassHealth: { colorRating: 5, diseaseRating: 1, pestRating: 1 },
    };

    it('defaults reproduce the standard budget when weights are omitted', () => {
      const result = calculatePitchQualityScore(perfectData);
      expect(result.total).toBe(95);
      expect(result.surfaceScore).toBe(20);
      expect(result.maintenanceScore).toBe(15);
    });

    it('lower weights scale sub-scores down proportionally', () => {
      const result = calculatePitchQualityScore(perfectData, { surface: 10 });
      expect(result.surfaceScore).toBe(10);
      expect(result.total).toBe(85);
      expect(result.maintenanceScore).toBe(15);
    });

    it('a zero weight disables that category entirely', () => {
      const result = calculatePitchQualityScore(perfectData, { grass: 0 });
      expect(result.grassScore).toBe(0);
      expect(result.total).toBe(75);
    });

    it('partial weights fall back to defaults for missing keys', () => {
      const weights = normalizeScoringWeights({ soil: 5 });
      expect(weights.soil).toBe(5);
      expect(weights.surface).toBe(DEFAULT_SCORING_WEIGHTS.surface);
      expect(weights.grass).toBe(DEFAULT_SCORING_WEIGHTS.grass);
      expect(weights.maintenance).toBe(DEFAULT_SCORING_WEIGHTS.maintenance);
    });

    it('clamps invalid weights to the allowed 0-20 range', () => {
      const weights = normalizeScoringWeights({ surface: 99, structural: -5, soil: 'banana' });
      expect(weights.surface).toBe(20);
      expect(weights.structural).toBe(DEFAULT_SCORING_WEIGHTS.structural);
      expect(weights.soil).toBe(DEFAULT_SCORING_WEIGHTS.soil);
    });
  });
});