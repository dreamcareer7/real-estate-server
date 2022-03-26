SELECT   DISTINCT deals.id, deals.updated_at
FROM     deals
JOIN     deals_acl($1) acl ON deals.id = acl.deal
WHERE    deals.deleted_at IS NULL
ORDER BY deals.updated_at DESC
LIMIT $2
