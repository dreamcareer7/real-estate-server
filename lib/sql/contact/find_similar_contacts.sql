WITH duplicate_attrs AS (
  SELECT
    text, array_agg(contact) ids
  FROM
    contacts_attributes AS ca
    JOIN contacts
      ON ca.contact = contacts.id
  WHERE
    contacts.deleted_at IS NULL
    AND ca.deleted_at IS NULL
    AND attribute_type IN ('email', 'phone_number')
    AND "user" = $1
  GROUP BY
    text
), duplicate_clusters AS (
  SELECT
    ids
  FROM
    duplicate_attrs
  WHERE
    ARRAY_LENGTH(ids, 1) > 1
)
SELECT DISTINCT
  a, b
FROM
  duplicate_attrs,
  compute_combinations(ids)
