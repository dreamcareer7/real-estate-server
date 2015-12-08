SELECT (
        EXTRACT(
        EPOCH FROM (
            DATE_TRUNC('day', (NOW() AT TIME ZONE users.timezone) + INTERVAL '02:30:00') +
            INTERVAL '9:30:00'
        ) AT TIME ZONE users.timezone) -
        EXTRACT(EPOCH FROM NOW())
       ) AS remaining
FROM users
WHERE id = $1
