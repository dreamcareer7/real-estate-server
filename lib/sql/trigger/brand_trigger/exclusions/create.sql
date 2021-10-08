-- $1: brand_trigger_id
-- $2: contact_ids

INSERT INTO brand_triggers_exclusions (
  brand_trigger,
  contact
) SELECT 
  $1::uuid,
  c.contact::uuid
FROM
  json_to_recordset($2::json) as c (
    contact uuid
  )
