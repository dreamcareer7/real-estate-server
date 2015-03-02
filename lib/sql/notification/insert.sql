INSERT INTO notifications(
            notification_action,
            object,
            message,
            referred_user,
            referred_shortlist
        )
VALUES ($1, $2, $3, $4, $5) RETURNING id;
