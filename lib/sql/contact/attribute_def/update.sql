WITH u AS (
  UPDATE
    contacts_attribute_defs
  SET
    label = $2,
    section = $3,
    "required" = $4,
    singular = $5,
    searchable = $6,
    has_label = $7,
    labels = $8::text[],
    enum_values = $9::text[],
    updated_at = now(),
    updated_by = $10::uuid,
    updated_within = $11
  WHERE
    id = $1
  RETURNING
    id
), cids AS (
  SELECT
    array_agg(c.id) AS ids
  FROM
    contacts_attributes AS ca
    JOIN contacts AS c
      ON ca.contact = c.id
    JOIN u
      ON ca.attribute_def = u.id
  WHERE
    c.deleted_at IS NULL
    AND ca.deleted_at IS NULL
), csf AS (
  SELECT
    gsfc.*
  FROM
    cids,
    get_search_field_for_contacts(cids.ids) AS gsfc
)
UPDATE
  contacts
SET
  search_field = csf.search_field
FROM
  csf
WHERE
  id = csf.contact
RETURNING
  id
