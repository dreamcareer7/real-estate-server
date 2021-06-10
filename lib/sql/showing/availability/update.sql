WITH d AS MATERIALIZED (
  DELETE FROM
    showings_availabilities
  WHERE
    showing = $1::uuid
  RETURNING
    id
), i AS MATERIALIZED (
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
  id
FROM
  d, i