INSERT INTO super_campaigns_enrollments (
  super_campaign,
  brand,
  "user",
  tags
)
SELECT
  t.super_campaign,
  t.brand,
  t."user",
  ARRAY(SELECT json_array_elements_text(t.tags))
FROM json_to_recordset($1::json) AS t (
  super_campaign uuid,
  brand uuid,
  "user" uuid,
  tags json
)
ON CONFLICT (super_campaign, brand, "user") DO UPDATE
  SET tags = ARRAY(SELECT json_array_elements_text(t.tags))
RETURNING id
