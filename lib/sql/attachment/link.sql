INSERT INTO attachments_eav(object, attachment)
VALUES ($1, $2)
ON CONFLICT DO NOTHING
