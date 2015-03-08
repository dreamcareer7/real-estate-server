INSERT INTO messages(
    message_room,
    message_type,
    comment,
    image_url,
    document_url,
    video_url,
    object,
    author
)
VALUES($1,
       $2,
       $3,
       $4,
       $5,
       $6,
       $7,
       $8)
RETURNING id;
