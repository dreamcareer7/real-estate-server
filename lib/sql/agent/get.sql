WITH agent_user AS (
  SELECT *
    FROM users
    WHERE agent = $1
    LIMIT 1
)

SELECT *,
       'agent' AS type,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at,

       (SELECT id FROM agent_user) as user_id,

       COALESCE(
         (SELECT profile_image_url FROM agent_user),
         (SELECT url FROM agents_images WHERE mui = agents.matrix_unique_id AND image_type = 'Profile' ORDER BY date DESC LIMIT 1)
       ) as profile_image_url,
       (
         SELECT ARRAY_AGG(DISTINCT phone)
         FROM agents_phones
         WHERE mui = agents.matrix_unique_id
       ) AS phone_numbers,
       (
         SELECT ARRAY_AGG(DISTINCT email)
         FROM agents_emails
         WHERE mui = agents.matrix_unique_id
       ) AS emails
FROM agents
WHERE id = $1
LIMIT 1;
