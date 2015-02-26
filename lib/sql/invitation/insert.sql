INSERT INTO invitation_records(
            referring_user,
            email,
            resource
        )
VALUES ($1, $2, $3) RETURNING id;
