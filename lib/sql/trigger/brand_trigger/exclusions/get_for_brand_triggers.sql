-- $1: brand_trigger_ids

SELECT
  e.brand_trigger,
  e.contact
FROM
  brand_triggers_exclusions AS e
WHERE
  e.brand_trigger = ANY($1::uuid[])