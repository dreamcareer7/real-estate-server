SELECT
  *,
  "timestamp" AS timestamp_readable,
  extract(epoch from "timestamp") AS "timestamp",
  'calendar_event' AS type
FROM
  analytics.calendar
WHERE
  (
    (
      "user" IS NULL
      AND "brand" = $2::uuid
    )
    OR
    (
      brand IS NULL
      AND "user" = $1::uuid
    )
  )
  AND (CASE
    WHEN "recurring" IS True THEN
      range_contains_birthday(to_timestamp($3), to_timestamp($4), "timestamp")
    ELSE
      "timestamp" BETWEEN to_timestamp($3) AND to_timestamp($4)
  END)
  AND (CASE
    WHEN $5::text[] IS NULL THEN TRUE
    ELSE event_type = ANY($5::text[])
  END)
