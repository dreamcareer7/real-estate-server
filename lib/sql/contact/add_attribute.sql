WITH u AS
(
  UPDATE contacts
  SET updated_at = CLOCK_TIMESTAMP()
  WHERE id = $1
)
INSERT INTO contacts_attributes
(
  contact,
  attribute_type,
  attribute
)
VALUES
(
  $1,
  $2,
  $3
)
