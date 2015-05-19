INSERT INTO notifications(
            action,
            object_class,
            object,
            notifying_user,
            message,
            auxiliary_object_class,
            auxiliary_object,
            recommendation,
            notified_user,
            shortlist
        )
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id;
