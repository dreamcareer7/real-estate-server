SELECT
  social_posts.id,
  social_posts.brand,
  social_posts.created_by,
  social_posts.caption,
  social_posts.facebook_page,
  social_posts.template_instance,
  social_posts.post_link,
  social_posts.failed_at,
  social_posts.failure,
  'social_post' AS TYPE,
  EXTRACT(EPOCH FROM social_posts.created_at) AS created_at,
  EXTRACT(EPOCH FROM social_posts.updated_at) AS updated_at,
  EXTRACT(EPOCH FROM social_posts.deleted_at) AS deleted_at,
  EXTRACT(EPOCH FROM social_posts.due_at) AS due_at,
  EXTRACT(EPOCH FROM social_posts.executed_at) AS executed_at,
  users.first_name as owner_first_name,
  users.last_name as owner_last_name,
  users.profile_image_url as owner_profile_image_url,
  users.profile_image_thumbnail_url as owner_profile_image_thumbnail_url
FROM
  social_posts
  JOIN facebook_pages on facebook_pages.id = social_posts.facebook_page
  JOIN facebook_credentials on facebook_credentials.id = facebook_pages.facebook_credential
  JOIN users on users.id = facebook_credentials.user
  JOIN unnest($1::uuid[])
  WITH ORDINALITY t (eid, ord) ON social_posts.id = eid
ORDER BY
  t.ord
