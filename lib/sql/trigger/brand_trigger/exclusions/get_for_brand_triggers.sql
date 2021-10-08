-- $1: brand_trigger_ids

SELECT
  e.id,
  e.brand_trigger,
  e.contact,
  e.deleted_at
FROM
  brand_triggers_exclusions AS e
WHERE
  e.brand_trigger = ANY($1::uuid[])
  AND deleted_at = NULL