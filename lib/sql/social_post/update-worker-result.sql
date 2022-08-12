UPDATE
    social_posts
SET
    insta_file = COALESCE($2, insta_file),
    post_link = COALESCE($3, post_link),
    published_media_id = COALESCE($4, published_media_id),
    media_container_id = COALESCE($5, media_container_id)
WHERE
    id = $1
