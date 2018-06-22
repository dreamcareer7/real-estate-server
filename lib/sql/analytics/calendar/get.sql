WITH ub AS (
  SELECT brand FROM user_brands($1) WHERE brand = $2::uuid
)
SELECT
  *,
  extract(epoch from "timestamp") AS "timestamp",
  'calendar_event' AS type
FROM
  analytics.calendar
WHERE
  (
    (
      "user" IS NULL
      AND "brand" = ANY(SELECT brand FROM ub)
    )
    OR
    (
      brand IS NULL
      AND "user" = $1::uuid
    )
  )
  AND (CASE
    WHEN "recurring" IS True THEN (
      (
        DATE_PART('month', "timestamp") > date_part('month', to_timestamp($3))
        OR (
          DATE_PART('month', "timestamp") = date_part('month', to_timestamp($3))
          AND
          DATE_PART('day', "timestamp") >= date_part('day', to_timestamp($3))
        )
      ) AND (
        DATE_PART('month', "timestamp") < date_part('month', to_timestamp($4))
        OR (
          DATE_PART('month', "timestamp") = date_part('month', to_timestamp($4))
          AND
          DATE_PART('day', "timestamp") <= date_part('day', to_timestamp($4))
        )
      )
    )
    ELSE "timestamp" BETWEEN to_timestamp($3) AND to_timestamp($4)
  END)