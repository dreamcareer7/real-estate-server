SELECT * FROM brands_subscriptions
WHERE customer = $1
AND   plan     = $2
AND   status IN('active', 'in_trial')
