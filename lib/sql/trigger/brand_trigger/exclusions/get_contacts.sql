-- $1: brand_id
-- $2: event_type

SELECT
  e.contact
FROM
  brand_triggers_exclusions AS e
WHERE
  e.brand = $1::uuid
  AND e.event_type = $2::text