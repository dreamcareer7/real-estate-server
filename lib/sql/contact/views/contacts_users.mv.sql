CREATE MATERIALIZED VIEW IF NOT EXISTS contacts_users AS
  (
    SELECT contacts_attributes.contact, users.id AS "user"
    FROM
      contacts_attributes
      INNER JOIN users
        ON users.email = contacts_attributes.text
    WHERE contacts_attributes.deleted_at IS NULL
      AND contacts_attributes.attribute_type = 'email'
      AND users.deleted_at IS NULL
      AND users.is_shadow IS FALSE
  )
  UNION (
    SELECT contacts_attributes.contact, users.id AS "user"
    FROM
      contacts_attributes
      INNER JOIN users
        ON users.phone_number = contacts_attributes.text
    WHERE contacts_attributes.deleted_at IS NULL
      AND contacts_attributes.attribute_type = 'phone_number'
      AND users.deleted_at IS NULL
      AND users.is_shadow IS FALSE
  )