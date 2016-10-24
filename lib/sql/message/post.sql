WITH unhide AS (
  UPDATE rooms
  SET deleted_at = NULL
  WHERE id = $1 AND
        deleted_at IS NOT NULL
)
INSERT INTO messages(
    room,
    message_type,
    comment,
    image_url,
    document_url,
    video_url,
    recommendation,
    reference,
    author,
    notification,
    mentions
)
VALUES($1,
       $2,
       $3,
       $4,
       $5,
       $6,
       $7,
       $8,
       $9,
       $10,
       $11)
RETURNING id;
