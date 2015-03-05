INSERT INTO notifications(
            action,
            object_class,
            object,
            acting_user,
            message,
            receiving_user,
            referred_shortlist
        )
VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
