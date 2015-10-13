INSERT INTO recommendations_eav(
                                "user",
                                recommendation,
                                action
                               )
SELECT v.* FROM (VALUES($1::uuid, $2::uuid, 'Read'::recommendation_action)) AS v(u, r, a)
LEFT JOIN recommendations_eav t ON
    t."user" = v.u AND
    t.recommendation = v.r AND
    t.action = v.a
WHERE t.recommendation IS NULL
