SELECT websites.id,
       'website' as type,
       EXTRACT(EPOCH FROM websites.created_at) AS created_at,
       (SELECT EXTRACT(EPOCH FROM websites_snapshots.created_at) FROM websites_snapshots WHERE websites_snapshots.website = websites.id ORDER BY websites_snapshots.created_at DESC LIMIT 1) AS updated_at,
       websites.user,
       (SELECT brand      FROM websites_snapshots WHERE website = websites.id ORDER BY created_at DESC LIMIT 1) AS brand,
       (SELECT template   FROM websites_snapshots WHERE website = websites.id ORDER BY created_at DESC LIMIT 1) AS template,
       (SELECT attributes FROM websites_snapshots WHERE website = websites.id ORDER BY created_at DESC LIMIT 1) AS attributes,
       (
         SELECT ARRAY_AGG(hostname ORDER BY "default" DESC) FROM websites_hostnames WHERE website = websites.id
       ) AS hostnames
FROM websites
JOIN unnest($1::uuid[]) WITH ORDINALITY t(wid, ord) ON websites.id = wid
ORDER BY t.ord
