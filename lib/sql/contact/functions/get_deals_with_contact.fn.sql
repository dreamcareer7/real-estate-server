CREATE OR REPLACE FUNCTION get_deals_with_contact (user_id uuid, contact_id uuid)
  RETURNS uuid[]
  LANGUAGE plpgsql
  STABLE
AS $$
  DECLARE
    cu uuid[];
    ub uuid[];
    res uuid[];
  BEGIN
    SELECT array_agg(brand) INTO ub FROM user_brands(user_id);
    SELECT get_contact_users(contact_id) INTO cu;
    SELECT 
      ARRAY_AGG(deal)
    INTO
      res
    FROM 
      deals_roles
      JOIN deals ON deals_roles.deal = deals.id 
    WHERE
      deals.brand = ANY(ub)
      AND deals_roles.deleted_at IS NULL 
      AND (
        deals_roles.user = ANY(cu)
        OR LOWER(deals_roles.email) IN (
          SELECT "text"
          FROM contacts_attributes
          WHERE
            contact = contact_id
            AND attribute_type = 'email'
        )
        OR deals_roles.phone_number IN (
          SELECT "text"
          FROM contacts_attributes
          WHERE
            contact = contact_id
            AND attribute_type = 'phone_number'
        )
      );
    RETURN res;
  END;
$$