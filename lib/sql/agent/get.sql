SELECT agents.*,
       'agent' AS type,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
       (SELECT id FROM users WHERE agent = agents.id LIMIT 1) as user_id,
       (SELECT profile_image_url FROM users WHERE agent = agents.id LIMIT 1) as profile_image_url,
       (SELECT cover_image_url FROM users WHERE agent = agents.id LIMIT 1) as cover_image_url,
       (
         SELECT ARRAY_AGG(DISTINCT phone)
         FROM agents_phones p
         WHERE p.agent = agents.id
       ) AS phone_numbers,
       (
         SELECT ARRAY_AGG(DISTINCT email)
         FROM agents_emails e
         WHERE e.agent = agents.id
       ) AS emails
FROM agents
JOIN unnest($1::uuid[]) WITH ORDINALITY t(aid, ord) ON agents.id = aid
ORDER BY t.ord
