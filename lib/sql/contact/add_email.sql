WITH u AS
(
  UPDATE contacts
  SET updated_at = NOW()
  WHERE id = $1
)
INSERT INTO contacts_emails
(
  contact,
  email,
  data
)
VALUES
(
  $1,
  $2,
  $3
)
