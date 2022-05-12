-- $1: brand (ID)
-- $2: [creator users (IDs)]
-- $3: [current user (ID)]
-- $4: [tags]

SELECT
  id,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  created_by,
  updated_by,
  tag,
  tag AS text,
  touch_freq,
  'crm_tag' AS type,

  (CASE
    WHEN $3::uuid IS NULL THEN FALSE
    ELSE EXISTS(
      SELECT 1 FROM super_campaigns_allowed_tags AS sct WHERE
        sct.brand = $1::uuid AND
        sct.user = $3::uuid AND
        sct.tag = tag
        LIMIT 1
    )
   END) AS auto_enroll_in_super_campaigns

FROM
  crm_tags
WHERE
  brand = $1::uuid
  AND deleted_at IS NULL
  AND (CASE WHEN $2::uuid[] IS NULL THEN TRUE ELSE created_by = ANY($2::uuid[]) END)
  AND (CASE WHEN $4::text[] IS NULL THEN TRUE ELSE tag = ANY($4::text[]) END)
ORDER BY
  tag
