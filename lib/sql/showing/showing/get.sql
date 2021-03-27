SELECT
  s.id,

  extract(epoch FROM created_at) AS created_at,
  extract(epoch FROM updated_at) AS updated_at,
  extract(epoch FROM deleted_at) AS deleted_at,

  created_by,
  updated_by,

  brand,
  start_date,
  end_date,
  aired_at,
  extract(epoch FROM duration) AS duration,
  extract(epoch FROM notice_period) AS notice_period,
  approval_type,

  feedback_template,
  deal,
  listing,
  STDADDR_TO_JSON(address) AS address,
  gallery,

  (
    SELECT
      array_agg(id ORDER BY "time" DESC) as ids
    FROM
      showings_appointments
    WHERE
      showing = s.id
      AND $2::text[] @> ARRAY['showing.appointments']
  ) AS appointments,

  (
    SELECT
      array_agg(id ORDER BY weekday DESC) as ids
    FROM
      showings_availabilities
    WHERE
      showing = s.id
      AND $2::text[] @> ARRAY['showing.availabilities']
  ) AS availabilities,

  (
    SELECT
      array_agg(id ORDER BY created_at) as ids
    FROM
      showings_roles
    WHERE
      showing = s.id
      AND $2::text[] @> ARRAY['showing.roles']
  ) AS roles,

  'showing' AS "type"
FROM
  showings AS s
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(id, ord)
    ON t.id = s.id
ORDER BY
  t.ord
