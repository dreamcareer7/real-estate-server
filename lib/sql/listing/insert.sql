INSERT INTO
    listings(property_id,
             alerting_agent_id,
             listing_agent_id,
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
             financing_proposed,
             list_office_mui,
             list_office_mls_id,
             list_office_name,
             list_office_phone,
             co_list_office_mui,
             co_list_office_mls_id,
             co_list_office_name,
             co_list_office_phone,
             selling_office_mui,
             selling_office_mls_id,
             selling_office_name,
             selling_office_phone,
             co_selling_office_mui,
             co_selling_office_mls_id,
             co_selling_office_name,
             co_selling_office_phone,
             list_agent_mui,
             list_agent_direct_work_phone,
             list_agent_email,
             list_agent_full_name,
             list_agent_mls_id,
             co_list_agent_mui,
             co_list_agent_direct_work_phone,
             co_list_agent_email,
             co_list_agent_full_name,
             co_list_agent_mls_id,
             selling_agent_mui,
             selling_agent_direct_work_phone,
             selling_agent_email,
             selling_agent_full_name,
             selling_agent_mls_id,
             co_selling_agent_mui,
             co_selling_agent_direct_work_phone,
             co_selling_agent_email,
             co_selling_agent_full_name,
             co_selling_agent_mls_id,
             listing_agreement,
             possession,
             capitalization_rate,
             compensation_paid,
             date_available,
             last_status,
             mls_area_major,
             mls_area_minor,
             mls,
             move_in_date,
             permit_address_internet_yn,
             permit_comments_reviews_yn,
             permit_internet_yn,
             price_change_timestamp,
             matrix_modified_dt,
             property_association_fees,
             showing_instructions_type,
             special_notes,
             tax_legal_description,
             total_annual_expenses_include,
             transaction_type,
             virtual_tour_url_branded,
             virtual_tour_url_unbranded,
             active_option_contract_date,
             keybox_type,
             keybox_number,
             close_date,
             close_price,
             back_on_market_date,
             deposit_amount,
             dom,
             cdom,
             buyers_agency_commission,
             sub_agency_commission,
             list_date,
             showing_instructions,
             appointment_phone,
             appointment_phone_ext,
             appointment_call,
             owner_name,
             seller_type,
             occupancy,
             private_remarks,
             photos_checked_at
            )
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
        $19,
        $20,
        $21,
        $22,
        $23,
        $24,
        $25,
        $26,
        $27,
        $28,
        $29,
        $30,
        $31,
        $32,
        $33,
        $34,
        $35,
        $36,
        $37,
        $38,
        $39,
        $40,
        $41,
        $42,
        $43,
        $44,
        $45,
        $46,
        $47,
        $48,
        $49,
        $50,
        $51,
        $52,
        $53,
        $54,
        $55,
        $56,
        $57,
        $58,
        $59,
        $60,
        $61,
        $62,
        $63,
        $64,
        $65,
        $66,
        CASE WHEN $67 = '' THEN NULL ELSE $67::timestamptz END,
        CASE WHEN $68 = '' THEN NULL ELSE $68::timestamptz END,
        $69,
        $70,
        $71,
        $72,
        $73,
        $74,
        $75,
        $76,
        $77,
        $78,
        $79,
        CASE WHEN $80 = '' THEN NULL ELSE $80::timestamptz END,
        $81,
        $82,
        $83,
        NOW() - $84 * INTERVAL '1 DAY',
        NOW() - $85 * INTERVAL '1 DAY',
        $86,
        $87,
        CASE WHEN $88 = '' THEN NULL ELSE $88::timestamptz END,
        $89,
        $90,
        $91,
        $92,
        $93,
        $94,
        $95,
        $96,
        NOW()
       ) RETURNING id