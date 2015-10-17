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
    notification
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
       $10)
RETURNING id;
