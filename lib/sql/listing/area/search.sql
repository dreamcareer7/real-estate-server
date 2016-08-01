WITH majors AS (
  SELECT
    DISTINCT ON(major_number)
    major_title::text as title,
    major_number::int as number,
    0::int as parent_number,
    'mls_area_major'::text as type
  FROM mls_areas
    WHERE major_title ILIKE '%' || $1 || '%'
),

minors AS (
  SELECT
    DISTINCT ON(minor_number)
    minor_title::text as title,
    minor_number::int as number,
    major_number::int as parent_number,
    'mls_area_minor'::text as type
  FROM mls_areas
    WHERE minor_title ILIKE '%' || $1 || '%'
)

SELECT * FROM majors
UNION
SELECT * FROM minors;