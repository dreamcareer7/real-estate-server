WITH u AS
(
  UPDATE contacts
  SET updated_at = CLOCK_TIMESTAMP()
  WHERE id = $1
), ua AS
(
  UPDATE contacts_emails
  SET is_primary = CASE WHEN $5 = True THEN False ELSE is_primary END,
      updated_at = CLOCK_TIMESTAMP()
  WHERE is_primary <> CASE WHEN $5 = True THEN False ELSE is_primary END
)
INSERT INTO contacts_emails
(
  contact,
  email,
  data,
  label,
  is_primary
)
VALUES
(
  $1,
  LOWER($2),
  $3,
  $4,
  $5
)
