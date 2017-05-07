SELECT 'review' AS type,
       reviews.id,
       EXTRACT(EPOCH FROM reviews.created_at) AS created_at,
       EXTRACT(EPOCH FROM reviews_history.created_at) AS updated_at,
       EXTRACT(EPOCH FROM reviews.deleted_at) AS deleted_at,
       (SELECT created_by FROM reviews_history WHERE review = $1 ORDER BY created_at ASC LIMIT 1) as created_by,
       reviews.deal,
       reviews.file,
       reviews.envelope_document,
       (SELECT created_by FROM reviews_history WHERE review = reviews.id ORDER BY created_at DESC LIMIT 1) AS updated_by,
       (SELECT state      FROM reviews_history WHERE review = reviews.id ORDER BY created_at DESC LIMIT 1) AS state,
       (SELECT comment    FROM reviews_history WHERE review = reviews.id ORDER BY created_at DESC LIMIT 1) AS comment,
       (SELECT id         FROM reviews_history WHERE review = reviews.id ORDER BY created_at DESC LIMIT 1) AS last_revision,
       (
         SELECT COUNT(*) FROM reviews_history WHERE review = reviews.id
       ) AS revision_count
FROM reviews
JOIN unnest($1::uuid[]) WITH ORDINALITY t(rid, ord) ON reviews.id = rid
ORDER BY t.ord
