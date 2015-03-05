INSERT INTO notifications(
            action,
            object_class,
            object,
            subject,
            message,
            referred_user,
            referred_shortlist
        )
VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
