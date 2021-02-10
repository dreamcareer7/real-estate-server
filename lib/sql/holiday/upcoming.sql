SELECT id FROM holidays
WHERE deleted_at IS NULL
AND   ends_at > NOW() -- Forget about events that have ended already
AND   starts_at < $1
ORDER BY starts_at
