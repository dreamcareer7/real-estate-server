INSERT INTO
    recommendations(recommendation_type,
                    source,
                    source_url,
                    referring_user,
                    referring_savedsearch,
                    referring_shortlist,
                    object,
                    message_room)
VALUES ($1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9) RETURNING id
