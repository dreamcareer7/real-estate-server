/*
 * Executed after adding, updating and deleting attributes and merging contacts
 */
WITH summaries AS (
  SELECT
    id,
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
    ) AS display_name
  FROM
    get_contact_summaries($1::uuid[])
)
UPDATE
  contacts
SET
  display_name = summaries.display_name
FROM
  summaries
WHERE
  contacts.id = summaries.id