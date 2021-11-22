-- $1: brand
-- $2: event_type
-- $3: contact_ids

INSERT INTO brand_triggers_exclusions (
  brand,
  event_type,
  contact
) 
SELECT 
  $1::uuid,
  $2::text,
  UNNEST($3::uuid[])
ON CONFLICT ON CONSTRAINT
  brand_triggers_exclusions_pkey
DO NOTHING