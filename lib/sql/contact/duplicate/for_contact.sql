WITH cluster_id AS (
  SELECT cluster FROM contacts_duplicate_clusters WHERE contact = $2::uuid LIMIT 1
),
cluster_members AS (
  SELECT
    array_agg(id) AS contacts
  FROM
    contacts_duplicate_clusters
    JOIN contacts
      ON contact = contacts.id
  WHERE
    contacts.brand = $1::uuid
    AND deleted_at IS NULL
    AND cluster = (SELECT cluster FROM cluster_id LIMIT 1)
)
SELECT
  (SELECT cluster FROM cluster_id LIMIT 1) AS id,
  contacts,
  'contact_duplicate' AS "type"
FROM
  cluster_members
WHERE
  contacts IS NOT NULL
