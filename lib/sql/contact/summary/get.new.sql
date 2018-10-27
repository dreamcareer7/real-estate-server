SELECT
  id,
  title,
  first_name,
  middle_name,
  last_name,
  marketing_name,
  nickname,
  email[0] AS email,
  phone_number[0] AS phone_number,
  company,
  birthday,
  profile_image_url,
  cover_image_url,
  job_title,
  source_type,
  source,
  website[0] AS websites,
  tag[0] AS tags,
  display_name,
  display_name AS abbreviated_display_name,
  'contact_summary' AS type
FROM
  contacts_summaries AS cs
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON cs.id = t.cid
ORDER BY
  t.ord
