-- ============================================================================
-- TurfCare BD — Analytics & list stored procedures (idempotent)
-- Install: npm run db:procedures
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper: defensively extract a numeric amount from a JSONB field.
-- Handles: {"amount": N}, {"total": N}, {"value": N}, bare numbers, and
-- malformed/unknown shapes (returns 0 instead of crashing).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_json_amount(j JSONB)
RETURNS NUMERIC AS $$
DECLARE
  v NUMERIC;
BEGIN
  IF j IS NULL THEN
    RETURN 0;
  END IF;

  IF jsonb_typeof(j) = 'number' THEN
    RETURN j::NUMERIC;
  END IF;

  IF jsonb_typeof(j) = 'string' THEN
    BEGIN
      v := COALESCE(NULLIF(BTRIM(j #>> '{}'), '')::NUMERIC, 0);
      RETURN v;
    EXCEPTION WHEN OTHERS THEN
      RETURN 0;
    END;
  END IF;

  IF j ? 'amount' THEN
    BEGIN
      v := COALESCE(NULLIF(j->>'amount', '')::NUMERIC, 0);
      RETURN v;
    EXCEPTION WHEN OTHERS THEN
      RETURN 0;
    END;
  END IF;

  IF j ? 'total' THEN
    BEGIN
      v := COALESCE(NULLIF(j->>'total', '')::NUMERIC, 0);
      RETURN v;
    EXCEPTION WHEN OTHERS THEN
      RETURN 0;
    END;
  END IF;

  IF j ? 'value' THEN
    BEGIN
      v := COALESCE(NULLIF(j->>'value', '')::NUMERIC, 0);
      RETURN v;
    EXCEPTION WHEN OTHERS THEN
      RETURN 0;
    END;
  END IF;

  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ---------------------------------------------------------------------------
-- 1. Dashboard metrics
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_analytics_dashboard(org_id TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'totalFields', (SELECT COUNT(*)::INT FROM "Field" WHERE "organizationId" = org_id),
    'totalInspections', (SELECT COUNT(*)::INT FROM "Inspection" WHERE "organizationId" = org_id),
    'avgScore', (SELECT COALESCE(ROUND(AVG(fn_json_amount(i."pitchQualityScore")), 1), 0)
                 FROM "Inspection" i
                 WHERE i."organizationId" = org_id AND i."pitchQualityScore" IS NOT NULL),
    'openWorkOrders', (SELECT COUNT(*)::INT FROM "WorkOrder"
                       WHERE "organizationId" = org_id
                         AND "status" NOT IN ('completed', 'verified', 'cancelled')),
    'inspectionsThisMonth', (SELECT COUNT(*)::INT FROM "Inspection"
                             WHERE "organizationId" = org_id
                               AND "inspectionDate" >= DATE_TRUNC('month', NOW())),
    'completedWorkOrders', (SELECT COUNT(*)::INT FROM "WorkOrder"
                            WHERE "organizationId" = org_id
                              AND "status" IN ('completed', 'verified')),
    'fieldsByStatus', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('status', s."status", 'count', s.cnt))
        FROM (SELECT "status", COUNT(*)::INT AS cnt
              FROM "Field" WHERE "organizationId" = org_id
              GROUP BY "status") s), '[]'::JSONB),
    'scoreTiers', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('tier', t.tier, 'count', t.cnt))
        FROM (
          SELECT CASE
                   WHEN sc.total >= 85 THEN 'excellent'
                   WHEN sc.total >= 70 THEN 'good'
                   WHEN sc.total >= 55 THEN 'acceptable'
                   ELSE 'poor'
                 END AS tier,
                 COUNT(*)::INT AS cnt
          FROM (SELECT fn_json_amount(i."pitchQualityScore") AS total
                FROM "Inspection" i
                WHERE i."organizationId" = org_id AND i."pitchQualityScore" IS NOT NULL) sc
          GROUP BY 1) t), '[]'::JSONB),
    'inspectionsByStatus', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('status', s."status", 'count', s.cnt))
        FROM (SELECT "status", COUNT(*)::INT AS cnt
              FROM "Inspection" WHERE "organizationId" = org_id
              GROUP BY "status") s), '[]'::JSONB)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ---------------------------------------------------------------------------
-- 2. Per-month avg PQS trend (12 months back)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_analytics_score_trends(org_id TEXT, field_id TEXT DEFAULT NULL)
RETURNS TABLE(month TEXT, avg_score NUMERIC, count BIGINT) AS $$
  SELECT TO_CHAR(d.month, 'YYYY-MM') AS month,
         COALESCE(ROUND(AVG(fn_json_amount(i."pitchQualityScore")), 1), 0) AS avg_score,
         COUNT(i.id)::BIGINT AS count
  FROM GENERATE_SERIES(
         DATE_TRUNC('month', NOW()) - INTERVAL '11 months',
         DATE_TRUNC('month', NOW()),
         INTERVAL '1 month'
       ) AS d(month)
  LEFT JOIN "Inspection" i
    ON DATE_TRUNC('month', i."inspectionDate") = d.month
   AND i."organizationId" = org_id
   AND (field_id IS NULL OR i."fieldId" = field_id)
  GROUP BY d.month
  ORDER BY d.month ASC;
$$ LANGUAGE sql STABLE;

-- ---------------------------------------------------------------------------
-- 3. Score histogram buckets (0-54, 55-69, 70-84, 85-100) + tier breakdown
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_analytics_score_distribution(org_id TEXT)
RETURNS TABLE(bucket TEXT, count BIGINT, tier TEXT) AS $$
  SELECT CASE
           WHEN sc.total < 55 THEN '0-54'
           WHEN sc.total < 70 THEN '55-69'
           WHEN sc.total < 85 THEN '70-84'
           ELSE '85-100'
         END AS bucket,
         COUNT(*)::BIGINT AS count,
         CASE
           WHEN sc.total >= 85 THEN 'excellent'
           WHEN sc.total >= 70 THEN 'good'
           WHEN sc.total >= 55 THEN 'acceptable'
           ELSE 'poor'
         END AS tier
  FROM (SELECT fn_json_amount(i."pitchQualityScore") AS total
        FROM "Inspection" i
        WHERE i."organizationId" = org_id AND i."pitchQualityScore" IS NOT NULL) sc
  GROUP BY 1, 3
  ORDER BY 1;
$$ LANGUAGE sql STABLE;

-- ---------------------------------------------------------------------------
-- 4. Work order counts by status
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_analytics_workorder_status(org_id TEXT)
RETURNS TABLE(status TEXT, count BIGINT) AS $$
  SELECT "status" AS status, COUNT(*)::BIGINT AS count
  FROM "WorkOrder"
  WHERE "organizationId" = org_id
  GROUP BY "status"
  ORDER BY count DESC;
$$ LANGUAGE sql STABLE;

-- ---------------------------------------------------------------------------
-- 5. Maintenance costs by month (estimated vs actual, defensive JSONB parse)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_analytics_maintenance_costs(org_id TEXT)
RETURNS TABLE(month TEXT, estimated_total NUMERIC, actual_total NUMERIC) AS $$
  SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') AS month,
         COALESCE(SUM(fn_json_amount("estimatedCost")), 0) AS estimated_total,
         COALESCE(SUM(fn_json_amount("actualCost")), 0) AS actual_total
  FROM "WorkOrder"
  WHERE "organizationId" = org_id
  GROUP BY 1
  ORDER BY 1;
$$ LANGUAGE sql STABLE;

-- ---------------------------------------------------------------------------
-- 6. Paginated inspection list — one round trip: JSONB_AGG rows + COUNT(*) OVER
--    Search: ILIKE on recommendations (JSONB cast to text) and inspection id.
--    Filters: status, field, score min/max. Sort: whitelisted columns.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_list_inspections(
  org_id TEXT,
  page INT DEFAULT 1,
  page_size INT DEFAULT 10,
  sort_field TEXT DEFAULT 'inspectionDate',
  sort_dir TEXT DEFAULT 'desc',
  search TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  field_filter TEXT DEFAULT NULL,
  score_min NUMERIC DEFAULT NULL,
  score_max NUMERIC DEFAULT NULL
)
RETURNS TABLE(data JSONB, total BIGINT) AS $$
DECLARE
  offs INT;
  order_expr TEXT;
  dir_expr TEXT;
  where_extra TEXT := '';
  q TEXT;
BEGIN
  offs := (GREATEST(page, 1) - 1) * GREATEST(page_size, 1);

  order_expr := CASE
    WHEN sort_field = 'score' THEN '("pitchQualityScore"->>''total'')::NUMERIC'
    WHEN sort_field IN ('inspectionDate', 'createdAt', 'status', 'id') THEN '"' || sort_field || '"'
    ELSE '"inspectionDate"'
  END;
  dir_expr := CASE WHEN LOWER(sort_dir) = 'asc' THEN 'ASC' ELSE 'DESC' END;

  IF status_filter IS NOT NULL THEN
    where_extra := where_extra || format(' AND i."status" = %L', status_filter);
  END IF;

  IF field_filter IS NOT NULL THEN
    where_extra := where_extra || format(' AND i."fieldId" = %L', field_filter);
  END IF;

  IF search IS NOT NULL AND BTRIM(search) <> '' THEN
    where_extra := where_extra || format(
      ' AND (i."id" ILIKE %L OR i."recommendations"::TEXT ILIKE %L)',
      '%' || search || '%',
      '%' || search || '%'
    );
  END IF;

  IF score_min IS NOT NULL THEN
    where_extra := where_extra || format(' AND fn_json_amount(i."pitchQualityScore") >= %s', score_min);
  END IF;

  IF score_max IS NOT NULL THEN
    where_extra := where_extra || format(' AND fn_json_amount(i."pitchQualityScore") <= %s', score_max);
  END IF;

  q := format(
    'WITH filtered AS (
       SELECT * FROM "Inspection" i
       WHERE i."organizationId" = $1%s
     ),
     paged AS (
       SELECT * FROM filtered
       ORDER BY %s %s
       LIMIT %s OFFSET %s
     )
     SELECT COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM paged p), ''[]''::jsonb),
            (SELECT COUNT(*)::BIGINT FROM filtered)',
    where_extra, order_expr, dir_expr, GREATEST(page_size, 1), offs
  );

  RETURN QUERY EXECUTE q USING org_id;
END;
$$ LANGUAGE plpgsql STABLE;