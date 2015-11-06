SELECT COALESCE(COUNT(messages.id) FILTER (WHERE messages.document_url IS NOT NULL)::INT, 0) AS document_count,
       COALESCE(COUNT(messages.id) FILTER (WHERE messages.image_url IS NOT NULL)::INT, 0) AS image_count,
       COALESCE(COUNT(messages.id) FILTER (WHERE messages.video_url IS NOT NULL)::INT, 0) AS video_count
FROM recommendations
INNER JOIN messages
ON recommendations.room = messages.room
WHERE recommendations.id = $1
GROUP BY messages.room
