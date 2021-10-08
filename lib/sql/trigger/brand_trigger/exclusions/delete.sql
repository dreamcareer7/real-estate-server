-- $1: brand_trigger_id
-- $2: contactIds
UPDATE
  brand_triggers_exclusions
SET
  deleted_at = NOW()
WHERE
  brand_trigger = $1::uuid
  AND contact = ANY($2::uuid[])
