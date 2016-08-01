CREATE MATERIALIZED VIEW mls_areas AS
SElECT
  DISTINCT ON (mls_area_major, mls_area_minor)
  (regexp_matches(mls_area_major, '(.+)\s\((\d+)\)$'))[1]::text AS major_title,
  (regexp_matches(mls_area_major, '(.+)\s\((\d+)\)$'))[2]::int AS major_number,

  (regexp_matches(mls_area_minor, '(.+)\s\((\d+)\)$'))[1]::text AS minor_title,
  (regexp_matches(mls_area_minor, '(.+)\s\((\d+)\)$'))[2]::int AS minor_number
FROM listings;

CREATE INDEX mls_areas_major_title_gin ON mls_areas USING gin (major_title gin_trgm_ops);
CREATE INDEX mls_areas_minor_title_gin ON mls_areas USING gin (minor_title gin_trgm_ops);