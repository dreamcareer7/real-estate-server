CREATE OR REPLACE FUNCTION get_contact_display_name(contact_id uuid)
RETURNS TABLE (
  display_name text
)
LANGUAGE SQL
STABLE
AS $function$
  WITH attrs AS (
    SELECT DISTINCT ON (attribute_def)
      *
    FROM
      contacts_attributes_with_name
    WHERE
      contact = contact_id
      AND deleted_at IS NULL
    ORDER BY
      attribute_def,
      is_primary desc,
      updated_at desc
  ),
  pivoted AS (
    SELECT
      contact_id AS id,
      ( SELECT text FROM attrs WHERE name = 'nickname' LIMIT 1 ) AS nickname,
      ( SELECT text FROM attrs WHERE name = 'first_name' LIMIT 1 ) AS first_name,
      ( SELECT text FROM attrs WHERE name = 'last_name' LIMIT 1 ) AS last_name,
      ( SELECT text FROM attrs WHERE name = 'company' LIMIT 1 ) AS company,
      ( SELECT text FROM attrs WHERE name = 'email' LIMIT 1 ) AS email,
      ( SELECT text FROM attrs WHERE name = 'phone_number' LIMIT 1 ) AS phone_number
  )
  SELECT COALESCE(
    CASE WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name ELSE NULL END,
    nickname,
    first_name,
    last_name,
    company,
    email,
    phone_number,
    'Guest'
  ) AS display_name
  FROM
    pivoted
$function$