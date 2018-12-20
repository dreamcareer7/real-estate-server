SELECT
  *,
  COALESCE(
    CASE WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name ELSE NULL END,
    marketing_name,
    nickname,
    first_name,
    last_name,
    company,
    email,
    phone_number,
    'Guest'
  ) AS display_name,
  COALESCE(
    nickname,
    first_name,
    company,
    email,
    phone_number,
    'Guest'
  ) AS abbreviated_display_name,
  'contact_summary' AS type
FROM
  get_contact_summaries($1::uuid[])
WHERE
  is_partner IS NOT TRUE
