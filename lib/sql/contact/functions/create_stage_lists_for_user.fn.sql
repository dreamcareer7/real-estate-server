CREATE OR REPLACE FUNCTION create_stage_lists_for_user(uuid) RETURNS setof uuid
LANGUAGE SQL
AS $$
  INSERT INTO contact_search_lists
    ("user", created_at, name, filters, is_pinned)
  (VALUES
    ($1::uuid, now() - interval '3 seconds', 'General', '[{"attribute_def": "5c1e76e3-3569-41ef-bd52-896b6e8f56fe", "invert": false, "value": "General"}]'::jsonb, false),
    ($1::uuid, now() - interval '2 seconds', 'Warm List', '[{"attribute_def": "5c1e76e3-3569-41ef-bd52-896b6e8f56fe", "invert": false, "value": "Warm List"}]'::jsonb, false),
    ($1::uuid, now() - interval '1 seconds', 'Hot List', '[{"attribute_def": "5c1e76e3-3569-41ef-bd52-896b6e8f56fe", "invert": false, "value": "Hot List"}]'::jsonb, false),
    ($1::uuid, now(), 'Past Client', '[{"attribute_def": "5c1e76e3-3569-41ef-bd52-896b6e8f56fe", "invert": false, "value": "Past Client"}]'::jsonb, false)
  )
  RETURNING id
$$