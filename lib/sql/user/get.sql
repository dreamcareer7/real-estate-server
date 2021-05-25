SELECT 'user' AS type,
       users.*,
       to_char(NOW() AT TIME ZONE users.timezone, 'FMHH:MI AM - FMDay Mon DD, YYYY') AS current_time,
       (((CURRENT_TIME(0) AT TIME ZONE users.timezone)::time > '08:00:00'::time) AND
       ((CURRENT_TIME(0) AT TIME ZONE users.timezone)::time < '23:59:59'::time)) AS push_allowed,
       EXTRACT(EPOCH FROM users.created_at)   AS created_at,
       EXTRACT(EPOCH FROM users.updated_at)   AS updated_at,
       EXTRACT(EPOCH FROM users.deleted_at)   AS deleted_at,
       EXTRACT(EPOCH FROM users.last_seen_at) AS last_seen_at,
       (
        SELECT client_type FROM clients WHERE id = users.last_seen_by
       ) as last_seen_type,
       (
        SELECT id FROM docusign_users WHERE "user" = users.id
       ) as docusign,
       COALESCE(
          COALESCE((SELECT
            us.brand
          FROM
            users_settings AS us
            JOIN brands_users AS bu
              ON us."user" = bu."user"
            JOIN brands_roles AS br
              ON br.id = bu.role
            JOIN brands AS b
              ON br.brand = b.id
          WHERE
            us."user" = users.id
            AND us.brand = br.brand
            AND b.deleted_at IS NULL
            AND br.deleted_at IS NULL
            AND bu.deleted_at IS NULL
          ORDER BY
            us.updated_at DESC
          LIMIT 1
         ), (
          SELECT
            b.id
          FROM
            brands_users AS bu
            JOIN brands_roles AS br
              ON br.id = bu.role
            JOIN brands AS b
              ON br.brand = b.id
          WHERE
            bu."user" = users.id
            AND b.deleted_at IS NULL
            AND br.deleted_at IS NULL
            AND bu.deleted_at IS NULL
          ORDER BY
            b.created_at DESC
          LIMIT 1
        )),
        users.brand
      ) AS active_brand
FROM users
JOIN unnest($1::uuid[]) WITH ORDINALITY t(uid, ord) ON users.id = uid
ORDER BY t.ord
