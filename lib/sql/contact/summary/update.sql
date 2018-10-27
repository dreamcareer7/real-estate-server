WITH cs AS (
  SELECT
    c.id,
    c.created_by,
    c.updated_at,
    c."user",
    c.display_name,
    c.sort_field,
    c.partner_name,
    to_tsvector('english', c.searchable_field) AS search_field,
    c.next_touch,
    c.last_touch,
    ct.title,
    ct.first_name,
    ct.middle_name,
    ct.last_name,
    ct.marketing_name,
    ct.nickname,
    ct.email,
    ct.phone_number,
    ct.tag,
    ct.website,
    ct.company,
    ct.birthday,
    ct.profile_image_url,
    ct.cover_image_url,
    ct.job_title,
    ct.source_type,
    ct.source
  FROM
    get_contact_summaries2($1::uuid[]) AS ct
    JOIN contacts AS c USING (id)
)
UPDATE
  contacts_summaries
SET
  "user" = cs."user",
  updated_at = cs.updated_at,
  display_name = cs.display_name,
  sort_field = cs.sort_field,
  partner_name = cs.partner_name,
  search_field = cs.search_field,
  next_touch = cs.next_touch,
  last_touch = cs.last_touch,
  title = cs.title,
  first_name = cs.first_name,
  middle_name = cs.middle_name,
  last_name = cs.last_name,
  marketing_name = cs.marketing_name,
  nickname = cs.nickname,
  email = cs.email,
  phone_number = cs.phone_number,
  tag = cs.tag,
  website = cs.website,
  company = cs.company,
  birthday = cs.birthday,
  profile_image_url = cs.profile_image_url,
  cover_image_url = cs.cover_image_url,
  job_title = cs.job_title,
  source_type = cs.source_type,
  source = cs.source
FROM
  cs
WHERE
  cs.id = contacts_summaries.id
