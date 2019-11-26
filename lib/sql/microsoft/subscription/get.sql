SELECT
    'microsoft_subscription' AS type,
    microsoft_subscriptions.*
FROM
    microsoft_subscriptions
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(mid, ord)
ON 
    microsoft_subscriptions.id = mid
ORDER BY 
    t.ord