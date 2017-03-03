SELECT
(
  (
    SELECT COUNT(*)
    FROM contacts_emails
    INNER JOIN contacts
    ON contacts_emails.contact = contacts.id
    WHERE contacts_emails.email =
    (
      SELECT email FROM users WHERE id = $2
    ) AND contacts."user" = $1
  )
  +
  (
    SELECT COUNT(*)
    FROM contacts_phone_numbers
    INNER JOIN contacts
    ON contacts_phone_numbers.contact = contacts.id
    WHERE contacts_phone_numbers.phone_number =
    (
      SELECT phone_number FROM users WHERE id = $2
    ) AND contacts."user" = $1
  )
) AS is_connected
