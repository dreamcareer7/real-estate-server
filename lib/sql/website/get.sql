WITH websites AS (
  SELECT
    DISTINCT ON(websites.id)
    websites.id,
    'website' as type,
    EXTRACT(EPOCH FROM websites.created_at) AS created_at,
    EXTRACT(EPOCH FROM websites_snapshots.created_at) as updated_at,
    websites.user,
    websites_snapshots.brand,
    websites_snapshots.template,
    websites_snapshots.attributes,
    websites_snapshots.title,
    websites_snapshots.template_instance,
    (
      SELECT ARRAY_AGG(hostname ORDER BY "default" DESC) FROM websites_hostnames WHERE website = websites.id
    ) AS hostnames
  FROM websites
  JOIN websites_snapshots ON websites.id = websites_snapshots.website
  ORDER BY websites.id, websites_snapshots.created_at DESC
)
SELECT * FROM websites
JOIN unnest($1::uuid[]) WITH ORDINALITY t(wid, ord) ON websites.id = wid
ORDER BY t.ord
