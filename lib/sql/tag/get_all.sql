WITH c AS
(
  SELECT id
  FROM contacts
  WHERE "user" = $1 AND
        deleted_at IS NULL
)
SELECT COALESCE(attribute, '{}'::jsonb) || JSONB_BUILD_OBJECT
  (
    'id', id,
    'type', attribute_type,
    'created_at', EXTRACT(EPOCH FROM created_at),
    'updated_at', EXTRACT(EPOCH FROM updated_at)
  ) AS tag
FROM contacts_attributes
WHERE contact IN (SELECT id FROM c) AND
      attribute_type = 'tag' AND
      deleted_at IS NULL
