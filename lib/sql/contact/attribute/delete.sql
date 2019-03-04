WITH editable_attributes AS (
  SELECT
    aids.id
  FROM
    unnest($1::uuid[]) AS aids(id)
    JOIN contacts_attributes AS ca
      ON ca.id = aids.id
    JOIN contacts_attribute_defs AS cad
      ON ca.attribute_def = cad.id
  WHERE
    cad.editable IS TRUE
)
UPDATE
  contacts_attributes AS ca
SET
  deleted_at = now(),
  deleted_by = $2::uuid
FROM
  editable_attributes AS ea
WHERE
  ca.id = ea.id
RETURNING
  contact
