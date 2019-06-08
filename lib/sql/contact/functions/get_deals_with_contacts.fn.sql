CREATE OR REPLACE FUNCTION get_deals_with_contacts(user_id uuid, contact_ids uuid[])
RETURNS TABLE (
  deal uuid,
  contact uuid
)
LANGUAGE SQL
STABLE
AS $$
  WITH emails AS (
    SELECT text
    FROM contacts_attributes AS ca
    WHERE
      attribute_type = 'email'
      AND text <> ''
      AND deleted_at IS NULL
      AND contact = ANY(contact_ids)
  ),
  phones AS (
    SELECT text
    FROM contacts_attributes AS ca
    WHERE
      attribute_type = 'phone_number'
      AND text <> ''
      AND deleted_at IS NULL
      AND contact = ANY(contact_ids)
  ),
  contacts_users AS (
    SELECT cu.user_id AS "user", cu.contact_id AS "contact" FROM get_users_for_contacts(contact_ids) AS cu
  ),
  roles_with_deals AS (
    SELECT
      deals.id,
      dr.email,
      dr.phone_number,
      dr.user
    FROM deals_roles AS dr
    INNER JOIN deals ON deals.id = dr.deal
    INNER JOIN user_brands(user_id, NULL) ub ON ub = deals.brand
    WHERE
      dr.deleted_at IS NULL
      AND (
        dr.user = ANY(SELECT contacts_users.user FROM contacts_users)
        OR lower(dr.email) = ANY(SELECT text FROM emails)
        OR dr.phone_number = ANY(SELECT text FROM phones)
      )
  )
  (
    SELECT
      roles_with_deals.id AS deal,
      contacts_users.contact
    FROM
      contacts_users JOIN roles_with_deals USING ("user")
  )
  UNION (
    SELECT
      roles_with_deals.id AS deal,
      contacts_attributes.contact
    FROM
      contacts_attributes
      INNER JOIN roles_with_deals
        ON roles_with_deals.email = contacts_attributes.text
    WHERE contacts_attributes.deleted_at IS NULL
      AND contacts_attributes.text <> ''
      AND contacts_attributes.attribute_type = 'email'
      AND contacts_attributes.contact = ANY(contact_ids)
  )
  UNION (
    SELECT
      roles_with_deals.id AS deal,
      contacts_attributes.contact
    FROM
      contacts_attributes
      INNER JOIN roles_with_deals
        ON roles_with_deals.phone_number = contacts_attributes.text
    WHERE contacts_attributes.deleted_at IS NULL
      AND contacts_attributes.text <> ''
      AND contacts_attributes.attribute_type = 'phone'
      AND contacts_attributes.contact = ANY(contact_ids)
  )
$$
