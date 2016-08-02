SELECT
  DISTINCT ON(district)
  district,
  'school_district' as type
FROM schools
WHERE
  district ILIKE '%' || $1 || '%'