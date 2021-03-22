SELECT
  a.id,
  showing,
  weekday,
  availability,

  'showing_availability' AS "type"
FROM
  showings_availabilities AS a
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(id, ord)
    ON t.id = a.id
ORDER BY
  t.ord
