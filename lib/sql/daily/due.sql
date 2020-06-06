WITH user_schedules AS
(
  SELECT
    users.id as user,
    NOW() at time zone users.timezone as local_time,
    (NOW() at time zone users.timezone)::date + time '08:00' as scheduled_time
  FROM users
)

SELECT user_schedules.* FROM user_schedules
FULL JOIN dailies ON  dailies.user             = user_schedules.user
                  AND dailies.created_at::date = user_schedules.scheduled_time::date
WHERE local_time > scheduled_time
AND dailies.id IS NULL
