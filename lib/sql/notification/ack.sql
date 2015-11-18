INSERT INTO notifications_acks(
                                "user",
                                notification
                               )
SELECT v.* FROM (VALUES($1::uuid, $2::uuid)) AS v(u, n)
LEFT JOIN notifications_acks t ON
    t."user" = v.u AND
    t.notification = v.n
WHERE t.notification IS NULL
