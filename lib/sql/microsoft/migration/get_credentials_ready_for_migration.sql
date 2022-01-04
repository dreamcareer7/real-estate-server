SELECT
    id,
    contact_migration_status
FROM
    microsoft_credentials
WHERE
    revoked = false 
    AND deleted_at IS NULL 
    AND contact_migration_status = 'pending' 
