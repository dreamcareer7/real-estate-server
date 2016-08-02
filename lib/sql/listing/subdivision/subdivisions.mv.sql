CREATE MATERIALIZED VIEW subdivisions AS
SELECT
  DISTINCT(subdivision_name) AS title
FROM properties ORDER BY title;

CREATE INDEX subdivision_title_gin ON subdivisions USING gin (title gin_trgm_ops);
