INSERT INTO notification_tokens(
                                "user",
                                device_token
                               )
SELECT v.* FROM (VALUES($1::uuid, $2)) AS v(u, d)
LEFT JOIN notification_tokens t ON
    t."user" = v.u AND
    t.device_token = v.d
WHERE t.device_token IS NULL
