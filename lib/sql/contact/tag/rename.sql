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
  RETURNING
    ca.contact
), tag_updates AS (
  UPDATE
    crm_tags
  SET
    tag = $3,
    updated_at = NOW(),
    updated_by = $4::uuid,
    updated_within = $5
  WHERE
    tag = $2
  RETURNING
    1
)
SELECT DISTINCT
  au.contact
FROM
  attr_updates AS au
  LEFT JOIN list_updates
    ON TRUE
  LEFT JOIN tag_updates
    ON TRUE
