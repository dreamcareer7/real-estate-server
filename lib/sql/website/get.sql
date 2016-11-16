SELECT
  websites.id,
  'website' as type,
  EXTRACT(EPOCH FROM websites.created_at)           AS created_at,
  EXTRACT(EPOCH FROM websites_snapshots.created_at) AS updated_at,
  websites.user,
  websites_snapshots.brand,
  websites_snapshots.template,
  websites_snapshots.attributes,
  (
    SELECT ARRAY_AGG(hostname ORDER BY "default" DESC) FROM websites_hostnames WHERE website = $1
  ) AS hostnames
FROM websites
JOIN websites_snapshots ON websites.id = websites_snapshots.website
WHERE websites.id = $1
ORDER BY websites_snapshots.created_at DESC