WITH cs AS (
  SELECT
    c.id,
    ct.title,
    ct.first_name,
    ct.partner_first_name,
    ct.middle_name,
    ct.last_name,
    ct.partner_last_name,
    ct.marketing_name,
    ct.nickname,
    ct.email,
    ct.partner_email,
    ct.phone_number,
    ct.tag,
    ct.website,
    ct.company,
    ct.birthday,
    ct.profile_image_url,
    ct.cover_image_url,
    ct.job_title,
    ct.source_type,
    ct.source,
    ct.display_name,
    ct.partner_name,
    ct.sort_field,
    ct.address,
    csf.search_field
  FROM
    contacts AS c
    JOIN get_contact_summaries2($1::uuid[]) AS ct
      ON ct.id = c.id
    JOIN get_search_field_for_contacts($1::uuid[]) csf
      ON c.id = csf.contact
)
UPDATE
  contacts
SET
  title = cs.title,
  first_name = cs.first_name,
  partner_first_name = cs.partner_first_name,
  middle_name = cs.middle_name,
  last_name = cs.last_name,
  partner_last_name = cs.partner_last_name,
  marketing_name = cs.marketing_name,
  nickname = cs.nickname,
  email = cs.email,
  partner_email = cs.partner_email,
  phone_number = cs.phone_number,
  tag = cs.tag,
  website = cs.website,
  company = cs.company,
  birthday = cs.birthday,
  profile_image_url = cs.profile_image_url,
  cover_image_url = cs.cover_image_url,
  job_title = cs.job_title,
  source_type = cs.source_type,
  source = cs.source,
  address = cs.address,

  search_field = cs.search_field,
  display_name = cs.display_name,
  partner_name = cs.partner_name,
  sort_field = cs.sort_field
FROM
  cs
WHERE
  cs.id = contacts.id
