INSERT INTO recommendations(source,
                            source_url,
                            referring_savedsearch,
                            referred_shortlist,
                            object,
                            message_thread,
                            recommendation_type,
                            referring_user)
    SELECT source,
           source_url,
           referring_savedsearch,
           referred_shortlist,
           object, message_thread,
           recommendation_type,
           $1 AS referring_user
    FROM recommendations
    WHERE referred_shortlist = $2
    GROUP BY source,
             source_url,
             referring_savedsearch,
             referred_shortlist,
             object,
             message_thread,
             recommendation_type;
