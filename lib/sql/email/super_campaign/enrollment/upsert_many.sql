INSERT INTO super_campaigns_enrollments AS sce (
  super_campaign,
  brand,
  "user",
  tags,
  created_by
)
SELECT
  t.super_campaign,
  t.brand,
  t."user",
  ARRAY(SELECT json_array_elements_text(t.tags)),
  t.created_by
FROM json_to_recordset($1::json) AS t (
  super_campaign uuid,
  brand uuid,
  "user" uuid,
  tags json,
  created_by uuid
)
ON CONFLICT (super_campaign, brand, "user") DO UPDATE SET
  tags = excluded.tags::text[],
  created_by = excluded.created_by,
  deleted_at = NULL
RETURNING id
