CREATE OR REPLACE FUNCTION get_deals_with_contacts(user_id uuid, contact_ids uuid[])
RETURNS TABLE (
  deal uuid,
  contact uuid
)
LANGUAGE plpgsql
STABLE
AS $$
  DECLARE
    ub uuid[];
    email_attr uuid;
    phone_attr uuid;
    emails text[];
    phones text[];
  BEGIN
    SELECT array_agg(brand) INTO ub FROM user_brands(user_id);
    SELECT id INTO email_attr FROM contacts_attribute_defs WHERE name = 'email';
    SELECT id INTO phone_attr FROM contacts_attribute_defs WHERE name = 'phone_number';
    SELECT array_agg(text) INTO emails
      FROM contacts_attributes AS ca
      WHERE
        attribute_def = email_attr
        AND deleted_at IS NULL
        AND ca.contact = ANY(contact_ids);

    SELECT array_agg(text) INTO phones
      FROM contacts_attributes AS ca
      WHERE
        attribute_def = phone_attr
        AND deleted_at IS NULL
        AND ca.contact = ANY(contact_ids);

    RETURN QUERY WITH contacts_users AS (
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
      WHERE
        deals.brand = ANY(ub)
        AND dr.deleted_at IS NULL
        AND (
          dr.user = ANY(SELECT contacts_users.user FROM contacts_users)
          OR lower(dr.email) = ANY(emails)
          OR dr.phone_number = ANY(phones)
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
        AND contacts_attributes.attribute_def = email_attr
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
        AND contacts_attributes.attribute_def = phone_attr
        AND contacts_attributes.contact = ANY(contact_ids)
    );
  END;
$$