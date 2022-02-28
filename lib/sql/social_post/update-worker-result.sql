UPDATE social_posts SET
insta_file = $2,
post_link = $3,
published_media_id = $4,
updated_at = CLOCK_TIMESTAMP()
WHERE id = $1

