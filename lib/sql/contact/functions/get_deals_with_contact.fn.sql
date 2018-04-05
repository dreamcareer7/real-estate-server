CREATE OR REPLACE FUNCTION get_deals_with_contact (user_id uuid, contact_id uuid)
  RETURNS uuid[]
  LANGUAGE SQL
  STABLE
AS $$
  SELECT 
    ARRAY_AGG(deal)
  FROM 
    deals_roles
    JOIN deals ON deals_roles.deal = deals.id 
  WHERE
    deals.brand = ANY(SELECT brand FROM user_brands(user_id))
    AND deals_roles.deleted_at IS NULL 
    AND (
      deals_roles.user = ANY(get_contact_users(contact_id))
      OR LOWER(deals_roles.email) IN (
        SELECT "text"
        FROM contacts_attributes_with_name
        WHERE
          contact = contact_id
          AND "name" = 'email'
      )
      OR deals_roles.phone_number IN (
        SELECT "text"
        FROM contacts_attributes_with_name
        WHERE
          contact = contact_id
          AND "name" = 'phone_number'
      )
    )
$$