INSERT INTO brands_webhooks
(brand, topic, key, url)
VALUES
($1, $2, $3, $4)
RETURNING id
