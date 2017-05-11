WITH r AS (
  SELECT 'recommendation' AS TYPE,
         recommendations.id,
         recommendations.source,
         recommendations.source_url,
         recommendations.referring_objects,
         recommendations.room,
         recommendations.listing,
         recommendations.recommendation_type,
         recommendations.hidden,
         recommendations.last_update,
         EXTRACT(EPOCH FROM recommendations.created_at) AS created_at,
         EXTRACT(EPOCH FROM recommendations.updated_at) AS updated_at,
         EXTRACT(EPOCH FROM recommendations.deleted_at) AS deleted_at,
         JSON_AGG(recommendations_eav."user" ORDER BY recommendations_eav.created_at) FILTER (WHERE recommendations_eav.action = 'Favorited') AS favorited_by,
         JSON_AGG(recommendations_eav."user" ORDER BY recommendations_eav.created_at) FILTER (WHERE recommendations_eav.action = 'Read') AS read_by,
         COALESCE(COUNT(messages.id) FILTER (WHERE messages.document_url IS NOT NULL)::INT, 0) AS document_count,
         COALESCE(COUNT(messages.id) FILTER (WHERE messages.image_url IS NOT NULL)::INT, 0) AS image_count,
         COALESCE(COUNT(messages.id) FILTER (WHERE messages.video_url IS NOT NULL)::INT, 0) AS video_count,
         (
          SELECT ARRAY_AGG("user") FROM rooms_users WHERE room = recommendations.room
         ) as users,
         COALESCE
         (
           COUNT(messages.id) FILTER
           (
             WHERE
             (
               messages.video_url IS NULL AND
               messages.document_url IS NULL AND
               messages.image_url IS NULL AND
               messages.notification IS NULL AND
               messages.id IS NOT NULL
             )
           )::INT, 0
         ) AS comment_count
  FROM recommendations
  FULL JOIN recommendations_eav
    ON recommendations.id = recommendations_eav.recommendation
  FULL JOIN messages
    ON recommendations.id = messages.recommendation
  WHERE recommendations.id = ANY($1)
  GROUP BY recommendations.id,
           recommendations.source,
           recommendations.source_url,
           recommendations.referring_objects,
           recommendations.room,
           recommendations.listing,
           recommendations.recommendation_type,
           recommendations.hidden,
           recommendations.created_at,
           recommendations.updated_at
)
SELECT r.*
FROM r
JOIN unnest($1::uuid[]) WITH ORDINALITY t(rid, ord) ON r.id = rid
ORDER BY t.ord
