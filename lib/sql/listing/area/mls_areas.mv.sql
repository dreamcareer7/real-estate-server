CREATE MATERIALIZED VIEW mls_areas AS
WITH majors AS (
  SELECT
    DISTINCT ON(mls_area_major)
    (regexp_matches(mls_area_major, '(.+)\s\((\d+)\)$'))[1]::text AS title,
    (regexp_matches(mls_area_major, '(.+)\s\((\d+)\)$'))[2]::int  AS number,
    0::int as parent
  FROM listings
),

minors AS (
  SElECT
    DISTINCT ON (mls_area_major, mls_area_minor)
    (regexp_matches(mls_area_minor, '(.+)\s\((\d+)\)$'))[1]::text AS title,
    (regexp_matches(mls_area_minor, '(.+)\s\((\d+)\)$'))[2]::int  AS number,
    (regexp_matches(mls_area_major, '(.+)\s\((\d+)\)$'))[2]::int  AS parent
  FROM listings
),

joined AS (
  SELECT * FROM majors
  UNION
  SELECT * FROM minors
)

SELECT
  (
    '[' || number || ',' || parent || ']'
  ) as id,
* FROM joined;

CREATE INDEX mls_areas_title_gin ON mls_areas USING gin (title gin_trgm_ops);
CREATE INDEX mls_areas_parent    ON mls_areas (parent);
