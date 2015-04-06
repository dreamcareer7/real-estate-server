INSERT INTO recommendations(source,
                            source_url,
                            referring_savedsearch,
                            referred_shortlist,
                            object,
                            message_room,
                            recommendation_type,
                            matrix_unique_id,
                            referring_user)
    SELECT source,
           source_url,
           referring_savedsearch,
           referred_shortlist,
           object,
           message_room,
           recommendation_type,
           matrix_unique_id,
           $1 AS referring_user
    FROM recommendations
    WHERE referred_shortlist = $2
    GROUP BY source,
             source_url,
             referring_savedsearch,
             referred_shortlist,
             object,
             message_room,
             matrix_unique_id,
             recommendation_type;
