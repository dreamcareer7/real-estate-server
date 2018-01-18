WITH u AS
(
  UPDATE contacts
  SET updated_at = CLOCK_TIMESTAMP()
  WHERE id = $1
),
ua AS
(
  UPDATE contacts_emails
  SET is_primary = CASE WHEN $5 = True THEN False ELSE is_primary END,
      updated_at = CLOCK_TIMESTAMP()
  WHERE id <> $2 AND is_primary <> CASE WHEN $5 = True THEN False ELSE is_primary END
)
UPDATE contacts_emails
SET email = $3,
    data = $4,
    label = $5,
    is_primary = $6,
    updated_at = CLOCK_TIMESTAMP()
WHERE contact = $1 AND
      id = $2
