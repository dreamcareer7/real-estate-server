INSERT INTO invitation_records(
            inviting_user,
            invited_user,
            email,
            resource
        )
VALUES ($1, $2, LOWER($3), $4) RETURNING id;
