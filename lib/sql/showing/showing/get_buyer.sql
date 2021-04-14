SELECT
  s.id,

  start_date,
  end_date,
  extract(epoch FROM duration) AS duration,
  same_day_allowed,
  extract(epoch FROM notice_period) AS notice_period,

  listing,

  (
    SELECT
      array_agg("time" ORDER BY "time" DESC)
    FROM
      showings_appointments
    WHERE
      showing = s.id
  ) AS unavailable_times,

  (
    SELECT
      array_agg(id ORDER BY weekday DESC) as ids
    FROM
      showings_availabilities
    WHERE
      showing = s.id
  ) AS availabilities,

  (
    SELECT
      u.agent
    FROM
      showings_roles AS r
      JOIN users AS u
        ON r.user = u.id
    WHERE
      showing = s.id
  ) AS agent,

  'showing_public' AS "type"
FROM
  showings AS s
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(id, ord)
    ON t.id = s.id
ORDER BY
  t.ord
