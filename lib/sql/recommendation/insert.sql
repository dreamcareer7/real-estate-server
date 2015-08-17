INSERT INTO
    recommendations(recommendation_type,
                    source,
                    source_url,
                    referred_user,
                    referring_alerts,
                    referred_shortlist,
                    object,
                    message_room,
                    matrix_unique_id)
VALUES ($1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9) RETURNING id
