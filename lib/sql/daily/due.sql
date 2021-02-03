WITH user_schedules AS
(
  SELECT
    users.id as user,
    users.timezone,

    -- Current time at user's local timezone
    NOW() at time zone users.timezone as local_time,

    -- When we are supposed to send the at his tz
    (NOW() at time zone users.timezone)::date + time '06:00' as scheduled_time,

    -- Our last chance to send it. Basically, if we fail to end by this time,
    -- or user activates daily emails after this time
    -- daily will be skipped for the day
    (NOW() at time zone users.timezone)::date + time '09:00' as expire_time
  FROM users
  WHERE daily_enabled IS TRUE
)

SELECT user_schedules.* FROM user_schedules
FULL JOIN dailies ON  dailies.user             = user_schedules.user
AND
(dailies.created_at::timestamp with time zone AT time zone user_schedules.timezone)::date = user_schedules.scheduled_time::date
WHERE local_time > scheduled_time
AND   local_time < expire_time
AND dailies.id IS NULL
