/*
 * Executed after adding, updating and deleting attributes and merging contacts
 */
WITH cs AS (
  SELECT
    *
  FROM
    get_contact_summaries($1::uuid[])
), primary_summaries AS (
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
    ) AS display_name,
    COALESCE(
      CASE WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN last_name || ' ' || first_name ELSE NULL END,
      last_name,
      marketing_name,
      first_name,
      nickname,
      company,
      email,
      phone_number,
      'Guest'
    ) AS sort_field
  FROM
    cs
  WHERE
    is_partner IS False
), partner_summaries AS (
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
      phone_number
    ) AS partner_name
  FROM
    cs
  WHERE
    is_partner IS True
), summaries AS (
  SELECT
    primary_summaries.id,
    display_name,
    sort_field,
    partner_name
  FROM
    primary_summaries
    FULL OUTER JOIN partner_summaries USING (id)
)
UPDATE
  contacts
SET
  display_name = summaries.display_name,
  partner_name = summaries.partner_name,
  sort_field = summaries.sort_field
FROM
  summaries
WHERE
  contacts.id = summaries.id
RETURNING
  contacts.id,
  contacts.display_name,
  contacts.sort_field,
  contacts.partner_name
