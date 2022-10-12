SELECT
  lead_channels.id,
  lead_channels.brand,
  lead_channels.user,
  lead_channels.source_type,
  lead_channels.capture_number,
  'lead_channel' AS TYPE,
  EXTRACT(EPOCH FROM lead_channels.created_at) AS created_at,
  EXTRACT(EPOCH FROM lead_channels.updated_at) AS updated_at,
  EXTRACT(EPOCH FROM lead_channels.deleted_at) AS deleted_at,
  EXTRACT(EPOCH FROM lead_channels.last_capture_date) AS last_capture_date
FROM
  lead_channels
  JOIN unnest($1::uuid[])
  WITH ORDINALITY t (eid, ord) ON lead_channels.id = eid
ORDER BY
  t.ord
