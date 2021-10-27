-- $1: super campaign (ID)
-- $2: (new) tags
-- $3: current (old) tags

UPDATE
  super_campaigns_enrollments
SET
  tags = $2::text[],
  updated_at = now()
WHERE
  deleted_at IS NULL AND
  detached = FALSE AND
  super_campaign = $1::uuid AND
  (CASE
    WHEN $3::text[] IS NULL THEN TRUE
    ELSE tags <@ $3::text[] AND tags @> $3::text[]
  END)
