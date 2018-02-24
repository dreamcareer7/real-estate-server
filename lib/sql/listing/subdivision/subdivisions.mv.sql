CREATE MATERIALIZED VIEW subdivisions AS
SELECT
  DISTINCT(subdivision_name) AS title,
  count(*) as appearances
FROM properties
GROUP BY title
ORDER BY title;

CREATE INDEX subdivision_title_gin ON subdivisions USING gin (title gin_trgm_ops);
