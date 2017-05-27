CREATE OR REPLACE FUNCTION propose_brand_agents(brand_id uuid, user_id uuid) RETURNS
   setof uuid
AS
$$
  WITH brand_users AS (
    SELECT id as "user" FROM users
    WHERE agent IN(
      SELECT get_brand_agents($1)
    )
  )

  , sorted AS (
      SELECT
      brand_users.user as "user",
      (
        CASE WHEN $2::uuid IS NULL THEN 0
            WHEN brand_users.user = (SELECT agent FROM users WHERE id = $2::uuid) THEN 1
            ELSE 0
        END
      ) as is_me,
      (
        CASE WHEN $2::uuid::uuid IS NULL THEN 0 ELSE
        (
          SELECT
          (
            (
              SELECT COUNT(*)
              FROM contacts
              INNER JOIN contacts_emails
              ON contacts.id = contacts_emails.contact
              WHERE contacts."user" = $2::uuid AND
                    LOWER(contacts_emails.email) = (SELECT lower(email) FROM users WHERE id = $2::uuid LIMIT 1)
            ) +
            (
              SELECT COUNT(*)
              FROM contacts
              INNER JOIN contacts_phone_numbers
              ON contacts.id = contacts_phone_numbers.contact
              WHERE contacts."user" = $2::uuid AND
                    contacts_phone_numbers.phone_number = (SELECT phone_number FROM users WHERE id = $2::uuid LIMIT 1)
            )
          )
        ) END
      ) as has_contact
      FROM brand_users
    ORDER BY is_me DESC, has_contact DESC, RANDOM()
  )

  SELECT "user" FROM sorted
$$
LANGUAGE sql;