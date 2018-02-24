CREATE MATERIALIZED VIEW counties AS
SELECT
  DISTINCT(county_or_parish) AS title
FROM addresses ORDER BY title;

CREATE UNIQUE INDEX counties_title ON counties(title);
CREATE INDEX county_title_gim ON counties USING gin (title gin_trgm_ops);
