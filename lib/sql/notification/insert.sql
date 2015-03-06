INSERT INTO notifications(
            action,
            object_class,
            object,
            notifying_user,
            message,
            notified_user,
            shortlist
        )
VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
