WITH d AS (
  DELETE FROM
    showings_availabilities
  WHERE
    showing = $1::uuid
  RETURNING
    id
), i AS (
  INSERT INTO showings_availabilities (
    showing,
    weekday,
    availability
  ) SELECT
    $1::uuid,
    sr.weekday,
    sr.availability::int4range
  FROM
    json_to_recordset($2::json) AS sr (
      weekday iso_day_of_week,
      availability int4range
    )
  RETURNING
    id
)
SELECT
  1
FROM
  d, i