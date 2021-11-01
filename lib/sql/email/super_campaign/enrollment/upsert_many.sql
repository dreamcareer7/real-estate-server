INSERT INTO super_campaigns_enrollments AS sce (
  super_campaign,
  brand,
  "user",
  tags,
  detached
)
SELECT
  t.super_campaign,
  t.brand,
  t."user",
  ARRAY(SELECT json_array_elements_text(t.tags)),
  COALESCE(t.detached, FALSE)
FROM json_to_recordset($1::json) AS t (
  super_campaign uuid,
  brand uuid,
  "user" uuid,
  tags json,
  detached boolean
)
ON CONFLICT (super_campaign, brand, "user") DO UPDATE SET
  tags = excluded.tags::text[],
  detached = excluded.detached,
  deleted_at = NULL
RETURNING id
