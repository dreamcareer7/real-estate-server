SELECT *,
       'agent' AS type,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
       (
         SELECT id
         FROM users
         WHERE agent = $1
         LIMIT 1
       ) AS user_id,
       (
         SELECT profile_image_url
         FROM users
         WHERE agent = $1
         LIMIT 1
       ) AS profile_image_url,
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
LIMIT 1
