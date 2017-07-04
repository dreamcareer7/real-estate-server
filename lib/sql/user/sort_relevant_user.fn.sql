CREATE OR REPLACE FUNCTION sort_relevant_users(ids uuid[], cid uuid) RETURNS
   setof uuid
AS
$$
WITH p AS (
  SELECT
    users.id as id,
    (
      CASE WHEN cid IS NULL THEN 0
           WHEN users.id = cid THEN 1
           ELSE 0
      END
    ) as is_me,
    (
      CASE WHEN cid IS NULL THEN 0 ELSE
      (
        SELECT
        (
          (
            SELECT COUNT(*)
            FROM contacts
            INNER JOIN contacts_emails
            ON contacts.id = contacts_emails.contact
            WHERE contacts."user" = cid AND
                  LOWER(contacts_emails.email) = (SELECT lower(email) FROM users WHERE id = cid LIMIT 1)
          ) +
          (
            SELECT COUNT(*)
            FROM contacts
            INNER JOIN contacts_phone_numbers
            ON contacts.id = contacts_phone_numbers.contact
            WHERE contacts."user" = cid AND
                  contacts_phone_numbers.phone_number = (SELECT phone_number FROM users WHERE id = cid LIMIT 1)
          )
        )
      ) END
    ) as has_contact
    FROM users
)
SELECT p.id
FROM p
ORDER BY p.is_me DESC, p.has_contact DESC
$$
LANGUAGE sql
