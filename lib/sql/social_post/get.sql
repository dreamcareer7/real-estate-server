SELECT 
  social_posts.id,
  social_posts.brand,
  social_posts.user,
  social_posts.caption,
  social_posts.facebook_page,
  social_posts.template,
  social_posts.post_link,
  social_posts.failed_at,
  social_posts.failure,
  'social_post' AS TYPE,
  EXTRACT(EPOCH FROM created_at)    AS created_at,
  EXTRACT(EPOCH FROM updated_at)    AS updated_at,
  EXTRACT(EPOCH FROM deleted_at)    AS deleted_at,
  EXTRACT(EPOCH FROM due_at)        AS due_at,
  EXTRACT(EPOCH FROM executed_at)   AS executed_at
FROM social_posts
JOIN unnest($1::uuid[]) WITH ORDINALITY t(eid, ord) ON social_posts.id = eid
ORDER BY t.ord  
