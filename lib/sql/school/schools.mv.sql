CREATE MATERIALIZED VIEW schools AS
SELECT
  DISTINCT elementary_school_name as name,
  count(*) as appearances,
  school_district as district,
  'elementary_school' as school_type
FROM properties
WHERE LENGTH(elementary_school_name) > 0
GROUP BY name, district

UNION

SELECT
  DISTINCT intermediate_school_name as name,
  count(*) as appearances,
  school_district as district,
  'intermediate_school' as school_type
FROM properties
WHERE LENGTH(intermediate_school_name) > 0
GROUP BY name, district

UNION

SELECT
  DISTINCT high_school_name as name,
  count(*) as appearances,
  school_district as district,
  'high_school' as school_type
FROM properties
WHERE LENGTH(high_school_name) > 0
GROUP BY name, district

UNION

SELECT
  DISTINCT junior_high_school_name as name,
  count(*) as appearances,
  school_district as district,
  'junior_high_school' as school_type
FROM properties
WHERE LENGTH(junior_high_school_name) > 0
GROUP BY name, district

UNION

SELECT
  DISTINCT middle_school_name as name,
  count(*) as appearances,
  school_district as district,
  'middle_school' as school_type
FROM properties
WHERE LENGTH(middle_school_name) > 0
GROUP BY name, district

UNION

SELECT
  DISTINCT senior_high_school_name as name,
  count(*) as appearances,
  school_district as district,
  'senior_high_school' as school_type
FROM properties
WHERE LENGTH(senior_high_school_name) > 0
GROUP BY name, district;

CREATE INDEX school_name_gin ON schools USING gin (name gin_trgm_ops);
CREATE INDEX school_district_gin ON schools USING gin (district gin_trgm_ops);
