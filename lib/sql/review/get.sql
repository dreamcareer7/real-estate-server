SELECT
  'review' AS type,
  reviews.id,
  EXTRACT(EPOCH FROM reviews.created_at) AS created_at,
  EXTRACT(EPOCH FROM reviews_history.created_at) AS updated_at,
  EXTRACT(EPOCH FROM reviews.deleted_at) AS deleted_at,
  (SELECT created_by FROM reviews_history WHERE review = $1 ORDER BY created_at ASC LIMIT 1) as created_by,
  reviews.deal,
  reviews.file,
  reviews.envelope_document,
  reviews_history.created_by as updated_by,
  reviews_history.state,
  reviews_history.comment
FROM reviews
JOIN reviews_history ON reviews.id = reviews_history.review
WHERE reviews.id = $1
ORDER BY reviews_history.created_at DESC LIMIT 1