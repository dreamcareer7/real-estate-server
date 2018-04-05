WITH ua AS
(
  UPDATE contacts_attributes
  SET is_primary = CASE WHEN $7 = True THEN False ELSE is_primary END,
      updated_at = CLOCK_TIMESTAMP()
  WHERE attribute_def = $2 AND is_primary <> CASE WHEN $7 = True THEN False ELSE is_primary END
)
INSERT INTO contacts_attributes
(
  contact,
  attribute_def,
  "text",
  "date",
  "number",
  label,
  is_primary
)
VALUES
(
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7
)
