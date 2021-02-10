SELECT
  holidays.*,
  'holiday' as type,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
  EXTRACT(EPOCH FROM starts_at)  AS starts_at,
  EXTRACT(EPOCH FROM ends_at)    AS ends_at
FROM holidays
JOIN unnest($1::uuid[]) WITH ORDINALITY t(hid, ord) ON holidays.id = hid
ORDER BY t.ord
