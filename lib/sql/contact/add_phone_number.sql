WITH u AS
(
  UPDATE contacts
  SET updated_at = CLOCK_TIMESTAMP()
  WHERE id = $1
)
INSERT INTO contacts_phone_numbers
(
  contact,
  phone_number,
  data,
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
