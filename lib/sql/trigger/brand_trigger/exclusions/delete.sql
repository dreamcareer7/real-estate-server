-- $1: brand
-- $2: event_type
-- $3: contact_ids

DELETE FROM 
    brand_triggers_exclusions
WHERE 
    brand = $1::uuid
    AND event_type = $2::text
    AND contact = ANY($3::uuid[])