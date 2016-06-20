WITH my_rooms AS (
  SELECT DISTINCT room FROM rooms_users WHERE "user" = $1
),

my_mates AS (
  SELECT DISTINCT "user" FROM rooms_users WHERE room IN(SELECT * FROM my_rooms)
),

matching_mates AS (
  SELECT id FROM users
  WHERE
  deleted_at IS NULL
  AND id IN(SELECT * FROM my_mates)
  AND ((first_name || ' ' || last_name || ' ' || email) ~* ANY ($2))
),

matching_rooms AS (
  SELECT id FROM rooms
  WHERE
    id IN (SELECT * FROM my_rooms)
    AND deleted_at IS NULL
    AND (
      (title ~* ANY ($2))
      OR
      id IN (SELECT room FROM rooms_users WHERE "user" IN (SELECT * FROM matching_mates))
    )
)

SELECT id
FROM alerts
WHERE
  (
    title ~* ANY ($2)
    AND
    room IN(SELECT * FROM my_rooms)
  )
  OR
  (
    room IN (SELECT id FROM matching_rooms)
  )
  AND deleted_at IS NULL
ORDER BY title;

