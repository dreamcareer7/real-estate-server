-- $1: brand_trigger_id
-- $2: contact_ids

INSERT INTO brand_triggers_exclusions (
  brand_trigger,
  contact
) VALUES (
  $1::uuid,
  $2::uuid
)
RETURNING id
