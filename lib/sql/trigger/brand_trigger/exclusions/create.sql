-- $1: brand
-- $2: event_type
-- $3: contact_ids

INSERT INTO brand_triggers_exclusions (
  brand,
  event_type,
  contact
) SELECT 
  $1::uuid,
  $2::text,
  unnest($3::uuid[])