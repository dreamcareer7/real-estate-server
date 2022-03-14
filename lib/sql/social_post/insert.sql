INSERT INTO social_posts
    ("user", brand, template_instance, facebook_page, due_at, caption)
VALUES
    ($1, $2, $3, $4, to_timestamp($5), $6)
RETURNING id
