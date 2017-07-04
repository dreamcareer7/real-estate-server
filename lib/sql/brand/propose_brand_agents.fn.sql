CREATE OR REPLACE FUNCTION propose_brand_agents(brand_id uuid, user_id uuid) RETURNS TABLE(
  "user" uuid,
  mlsid text,
  is_me boolean,
  has_contact boolean
)
AS
$$
  SELECT
  brand_agents.user as "user",
  brand_agents.mlsid as mlsid,
  (
    CASE WHEN $2::uuid IS NULL THEN false
        WHEN brand_agents.user = $2::uuid THEN true
        ELSE false
    END
  )::boolean as is_me,
  (
    CASE WHEN $2::uuid::uuid IS NULL THEN false ELSE
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
      ) > 0
    ) END
  )::boolean as has_contact
  FROM get_brand_agents($1) brand_agents
$$
LANGUAGE sql;