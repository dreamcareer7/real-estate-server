SELECT id
FROM forms
WHERE deleted_at IS NULL
ORDER BY name ASC
