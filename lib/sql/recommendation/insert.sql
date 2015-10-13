INSERT INTO
    recommendations(recommendation_type,
                    source,
                    source_url,
                    referring_alerts,
                    room,
                    listing,
                    matrix_unique_id)
VALUES ($1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7) RETURNING id
