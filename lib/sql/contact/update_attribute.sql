WITH u AS
(
  UPDATE contacts
  SET updated_at = NOW()
  WHERE id = $1
)
UPDATE contacts_attributes
SET attribute_type = $3,
    attribute = $4,
    updated_at = NOW()
WHERE contact = $1 AND
      id = $2
