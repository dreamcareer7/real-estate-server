WITH cids AS (
  UPDATE
    contacts_attributes AS ca
  SET
    deleted_at = NOW(),
    deleted_by = $2::uuid,
    deleted_within = $5
  WHERE
    CASE
      WHEN $4::boolean IS TRUE THEN
        ca.text = ANY($3::text[])
      ELSE
        lower(ca.text) = ANY($3::text[])
    END
    AND attribute_type = 'tag'
    AND ca.contact = ANY(
      SELECT
        id
      FROM
        contacts
      WHERE
        brand = $1
    )
  RETURNING
    ca.contact
), tag_delete AS (
  UPDATE
    crm_tags
  SET
    deleted_at = NOW(),
    deleted_by = $2::uuid,
    deleted_within = $5
  WHERE
    CASE
      WHEN $4::boolean IS TRUE THEN
        tag = ANY($3::text[])
      ELSE
        lower(tag) = ANY($3::text[])
    END
  RETURNING
    1
)
SELECT DISTINCT contact AS id FROM cids, tag_delete
