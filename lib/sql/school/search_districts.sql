SELECT
  DISTINCT ON(district)
  district,
  'school_district' as type
FROM
  (
    SELECT unnest($1::text[]) as query
  ) queries
JOIN
  schools ON schools.district ILIKE queries.query
ORDER BY district ASC;
