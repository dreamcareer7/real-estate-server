SELECT
  s.human_readable_id AS id,

  title,
  start_date,
  end_date,
  extract(epoch FROM duration) AS duration,
  same_day_allowed,
  extract(epoch FROM notice_period) AS notice_period,
  deal,

  (SELECT
    timezone
  FROM
    users AS u
    JOIN showings_roles AS sr
      ON u.id = sr.user
  WHERE
    sr.showing = s.id
    AND sr.role = 'SellerAgent'
    AND sr.deleted_at IS NULL
  ) AS timezone,

  (CASE WHEN deal IS NOT NULL THEN (SELECT listing FROM deals WHERE id = deal) ELSE listing END) AS listing,
  (
    CASE WHEN deal IS NOT NULL THEN (
      SELECT gallery FROM deals WHERE id = deal
    ) ELSE gallery END
  ) AS gallery,

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
      JSON_BUILD_OBJECT(
        'id', u.agent,
        'first_name', r.first_name,
        'last_name', r.last_name,
        'full_name', r.first_name || ' ' || r.last_name,
        'email', r.email,
        'phone_number', r.phone_number,
        'profile_image_url', u.profile_image_url,
        'office', o.name,
        'type', 'showing_agent'
      )
    FROM
      showings_roles AS r
      JOIN users AS u
        ON r.user = u.id
      LEFT JOIN agents AS a
        ON r.agent = a.id
      LEFT JOIN offices AS o
        ON (a.office_mui = o.matrix_unique_id AND a.mls = o.mls)
    WHERE
      showing = s.id
    LIMIT 1
  ) AS agent,

  (
    SELECT
      marketing_palette
    FROM
      brand_settings
    WHERE
      brand = s.brand
  ) AS palette,

  'showing_public' AS "type"
FROM
  showings AS s
  JOIN unnest($1::integer[]) WITH ORDINALITY t(id, ord)
    ON t.id = s.human_readable_id
ORDER BY
  t.ord
