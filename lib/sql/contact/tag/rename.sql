-- $1: brand (ID)
-- $2: old tag name
-- $3: new tag name
-- $4: user (ID)
-- $5: context ID

WITH tag_def AS (
  SELECT id FROM contacts_attribute_defs WHERE name = 'tag' LIMIT 1
), list_updates AS (
  UPDATE
    crm_lists_filters
  SET
    value = to_json($3::text)
  WHERE
    value#>>'{}' = $2::text
    AND attribute_def = (SELECT id FROM tag_def LIMIT 1)
  RETURNING
    1
), attr_updates AS (
  UPDATE
    contacts_attributes AS ca
  SET
    text = $3,
    updated_at = NOW(),
    updated_by = $4::uuid,
    updated_within = $5
  FROM
    contacts AS c
  WHERE
    c.brand = $1
    AND ca.contact = c.id
    AND ca.text = $2
    AND ca.attribute_type = 'tag'
  RETURNING
    ca.contact
), tag_updates AS (
  UPDATE
    crm_tags t1
  SET
    tag = $3,
    updated_at = NOW(),
    updated_by = $4::uuid,
    updated_within = $5
  WHERE
    tag = $2
    AND brand = $1
    AND deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM crm_tags t2 WHERE lower(t2.tag) = lower($3) AND t1.id != t2.id AND deleted_at IS NULL
    )
  RETURNING
    1
), tag_delete AS (
  UPDATE
    crm_tags t1
  SET
    deleted_at = NOW(),
    deleted_by = $4::uuid,
    deleted_within = $5
  WHERE
    tag = $2
    AND brand = $1
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM crm_tags t2 WHERE lower(t2.tag) = lower($3) AND t1.id != t2.id AND deleted_at IS NULL
    )
  RETURNING
    1
), sct_update AS (
  UPDATE super_campaigns_allowed_tags AS sct
  SET
    tag = $3::text
  WHERE
    sct.brand = $1::uuid AND
    sct.user = $4::uuid AND
    sct.tag = $2::text
  RETURNING
    1
)
SELECT DISTINCT
  au.contact
FROM
  attr_updates AS au
  LEFT JOIN list_updates
    ON TRUE
  LEFT JOIN tag_delete
    ON TRUE
  LEFT JOIN tag_updates
    ON TRUE
  LEFT JOIN sct_update
    ON TRUE
