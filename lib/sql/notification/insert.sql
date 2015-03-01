INSERT INTO notifications(
            notification_action,
            object,
            message,
            image_url,
            referring_user,
            referring_shortlist
        )
VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
