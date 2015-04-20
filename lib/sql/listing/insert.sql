INSERT INTO
    listings(property_id,
             alerting_agent_id,
             listing_agent_id,
             listing_agency_id,
             currency,
             price,
             status,
             matrix_unique_id,
             original_price,
             last_price,
             low_price,
             association_fee,
             association_fee_frequency,
             association_fee_includes,
             association_type,
             mls_number,
             unexempt_taxes,
             gallery_image_urls,
             cover_image_url)
VALUES ($1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16,
        $17,
        $18,
        $19) RETURNING id
