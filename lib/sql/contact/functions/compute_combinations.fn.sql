CREATE OR REPLACE FUNCTION compute_combinations(anyarray)
RETURNS TABLE (
  a anyelement,
  b anyelement
)
LANGUAGE SQL
IMMUTABLE
AS $$
  WITH u AS (
    SELECT
      unnest AS x
    FROM
      unnest($1)
  )
  SELECT
    a.x, b.x
  FROM
    u AS a CROSS JOIN u AS b
  WHERE
    a.x < b.x
$$;