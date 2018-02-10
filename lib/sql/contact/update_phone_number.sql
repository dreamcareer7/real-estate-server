WITH u AS
(
  UPDATE contacts
  SET updated_at = CLOCK_TIMESTAMP()
  WHERE id = $1
),
ua AS
(
  UPDATE contacts_phone_numbers
  SET is_primary = CASE WHEN $6 = True THEN False ELSE is_primary END,
      updated_at = CLOCK_TIMESTAMP()
  WHERE id <> $2 AND is_primary <> CASE WHEN $6 = True THEN False ELSE is_primary END
)
UPDATE contacts_phone_numbers
SET phone_number = $3,
    data = $4,
    label = $5,
    is_primary = $6,
    updated_at = CLOCK_TIMESTAMP()
WHERE contact = $1 AND
      id = $2
