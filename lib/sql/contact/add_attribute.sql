WITH u AS
(
  UPDATE contacts
  SET updated_at = CLOCK_TIMESTAMP()
  WHERE id = $1
), ua AS
(
  UPDATE contacts_attributes
  SET is_primary = CASE WHEN $5 = True THEN False ELSE is_primary END,
      updated_at = CLOCK_TIMESTAMP()
  WHERE attribute_type = $2 AND is_primary <> CASE WHEN $5 = True THEN False ELSE is_primary END
)
INSERT INTO contacts_attributes
(
  contact,
  attribute_type,
  attribute,
  label,
  is_primary
)
VALUES
(
  $1,
  $2,
  $3,
  $4,
  $5
)
