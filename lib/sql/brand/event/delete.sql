UPDATE
  brands_events
SET
  deleted_at = now(),
  deleted_by = $1::uuid,
  deleted_within = $2::text
WHERE
  id = $3::uuid
