SELECT
  id
FROM
  triggers
WHERE
  deleted_at IS NULL AND
  flow IS NULL AND
  flow_step IS NULL AND
  executed_at IS NULL AND
  (CASE WHEN $1::uuid IS NOT NULL THEN brand = $1::uuid
        ELSE TRUE END) AND
  (CASE WHEN $2::uuid[] IS NOT NULL THEN contact = ANY($2::uuid[])
        ELSE contact IS NOT NULL END) AND
  event_type = $3::text AND
  action = $4::trigger_action
