INSERT INTO recommendations(source,
                            source_url,
                            referring_alerts,
                            referred_shortlist,
                            object,
                            message_room,
                            recommendation_type,
                            matrix_unique_id,
                            referred_user)
    SELECT source,
           source_url,
           referring_alerts,
           referred_shortlist,
           object,
           message_room,
           recommendation_type,
           matrix_unique_id,
           $1 AS referred_user
    FROM recommendations
    WHERE referred_shortlist = $2
    GROUP BY source,
             source_url,
             referring_alerts,
             referred_shortlist,
             object,
             message_room,
             matrix_unique_id,
             recommendation_type;
