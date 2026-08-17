const SEVERITY_POINTS = { none: 5, low: 3, medium: 1, high: 0 };

const severity = (value) => SEVERITY_POINTS[value] ?? 0;

const num = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Default weight budget per scoring parameter (each on a 0-20 band, except
 * maintenance which is a fixed credit). Organizations may override these via
 * their settings.scoringWeights (Settings > Scoring weights).
 */
export const DEFAULT_SCORING_WEIGHTS = {
  surface: 20,
  soil: 20,
  structural: 20,
  grass: 20,
  maintenance: 15,
};

export const normalizeScoringWeights = (weights = {}) => {
  const out = {};
  for (const key of Object.keys(DEFAULT_SCORING_WEIGHTS)) {
    const value = Number(weights[key]);
    out[key] =
      Number.isFinite(value) && value >= 0
        ? Math.min(20, value)
        : DEFAULT_SCORING_WEIGHTS[key];
  }
  return out;
};

/**
 * Scales a raw 0-20 sub-score to the configured weight budget for that
 * parameter. With the default weight (20) the contribution equals the raw
 * score, so existing behavior is preserved.
 */
const scaleToWeight = (rawScore, weight) => Math.round((rawScore / 20) * weight);

/**
 * Soil moisture (percent): too dry (< 20%) or waterlogged (> 80%) harms the
 * pitch. Dry soil maps to the 'low' severity key (low score contribution),
 * waterlogged maps to 'high' (worst), ideal band maps to 'none' (best).
 */
const moistureSeverity = (moisture) => {
  const value = Number(moisture);
  if (!Number.isFinite(value)) return 'none';
  if (value < 20) return 'low';
  if (value > 80) return 'high';
  return 'none';
};

export const calculatePitchQualityScore = (inspectionData, weights = {}) => {
  const data = inspectionData || {};
  const surface = data.surfaceAssessment || {};
  const soil = data.soilAssessment || {};
  const structural = data.structuralAssessment || {};
  const grassHealth = data.grassHealth || {};
  const w = normalizeScoringWeights(weights);

  const rawSurface = Math.min(20, Math.round(
    num(surface.grassCoverPercent) * 0.2 +
    num(surface.colorUniformity, 1) * 4 +
    severity(surface.weedPresence) +
    severity(surface.pestDamage) +
    severity(surface.diseaseSigns)
  ));

  const rawSoil = Math.min(20, Math.round(
    Math.max(0, 20 - num(soil.compactionKgCm2) * 0.5) +
    Math.max(0, 10 - Math.abs(num(soil.ph, 7) - 7) * 5) +
    severity(moistureSeverity(soil.moistureContent))
  ));

  const rawStructural = Math.min(20, Math.round(
    Math.max(0, 20 - num(structural.surfaceEvennessMm) * 2) +
    Math.max(0, 20 - num(structural.drainageRateMinutes) * 0.5) +
    Math.max(0, 10 - num(structural.thatchDepthMm) * 2)
  ));

  const rawGrass = Math.min(20, Math.round(
    num(grassHealth.colorRating, 3) * 3 +
    (6 - num(grassHealth.diseaseRating, 3)) * 2 +
    (6 - num(grassHealth.pestRating, 3)) * 2
  ));

  const surfaceScore = scaleToWeight(rawSurface, w.surface);
  const soilScore = scaleToWeight(rawSoil, w.soil);
  const structuralScore = scaleToWeight(rawStructural, w.structural);
  const grassScore = scaleToWeight(rawGrass, w.grass);
  const maintenanceScore = Math.round(w.maintenance);

  const total = Math.round(surfaceScore + soilScore + structuralScore + grassScore + maintenanceScore);

  let tier = 'poor';
  if (total >= 85) tier = 'excellent';
  else if (total >= 70) tier = 'good';
  else if (total >= 55) tier = 'acceptable';

  return {
    total: Math.min(100, total),
    surfaceScore,
    soilScore,
    structuralScore,
    grassScore,
    maintenanceScore,
    tier,
  };
};

export const getScoreTier = (total) => {
  if (total >= 85) return 'excellent';
  if (total >= 70) return 'good';
  if (total >= 55) return 'acceptable';
  return 'poor';
};
