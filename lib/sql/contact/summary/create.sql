INSERT INTO
  contacts_summaries
  (
    id,
    created_by,
    created_at,
    updated_at,
    "user",
    display_name,
    search_field,
    next_touch,
    last_touch,
    title,
    first_name,
    middle_name,
    last_name,
    marketing_name,
    nickname,
    email,
    phone_number,
    tag,
    website,
    company,
    birthday,
    profile_image_url,
    cover_image_url,
    job_title,
    source_type,
    stage,
    source
  )
SELECT
  c.id,
  c.created_by,
  c.created_at,
  c.updated_at,
  c."user",
  c.display_name,
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
  ct.stage,
  ct.source
FROM
  get_contact_summaries2($1::uuid[]) AS ct
  JOIN contacts AS c USING (id)
RETURNING id
