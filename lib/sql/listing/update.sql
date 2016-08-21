UPDATE listings
SET alerting_agent_id = $1,
    listing_agent_id = $2,
    currency = $3,
    price = $4,
    status = $5,
    original_price = $6,
    last_price = $7,
    low_price = $8,
    association_fee = $9,
    association_fee_frequency = $10,
    association_fee_includes = $11,
    association_type = $12,
    unexempt_taxes = $13,
    financing_proposed = $14,
    list_office_mui = $15,
    list_office_mls_id = $16,
    list_office_name = $17,
    list_office_phone = $18,
    co_list_office_mui = $19,
    co_list_office_mls_id = $20,
    co_list_office_name = $21,
    co_list_office_phone = $22,
    selling_office_mui = $23,
    selling_office_mls_id = $24,
    selling_office_name = $25,
    selling_office_phone = $26,
    co_selling_office_mui = $27,
    co_selling_office_mls_id = $28,
    co_selling_office_name = $29,
    co_selling_office_phone = $30,
    list_agent_mui = $31,
    list_agent_direct_work_phone = $32,
    list_agent_email = $33,
    list_agent_full_name = $34,
    list_agent_mls_id = $35,
    co_list_agent_mui = $36,
    co_list_agent_direct_work_phone = $37,
    co_list_agent_email = $38,
    co_list_agent_full_name = $39,
    co_list_agent_mls_id = $40,
    selling_agent_mui = $41,
    selling_agent_direct_work_phone = $42,
    selling_agent_email = $43,
    selling_agent_full_name = $44,
    selling_agent_mls_id = $45,
    co_selling_agent_mui = $46,
    co_selling_agent_direct_work_phone = $47,
    co_selling_agent_email = $48,
    co_selling_agent_full_name = $49,
    co_selling_agent_mls_id = $50,
    listing_agreement = $51,
    possession = $52,
    capitalization_rate = $53,
    compensation_paid = $54,
    date_available = $55,
    last_status = $56,
    mls_area_major = $57,
    mls_area_minor = $58,
    mls = $59,
    move_in_date = $60,
    permit_address_internet_yn = $61,
    permit_comments_reviews_yn = $62,
    permit_internet_yn = $63,
    price_change_timestamp = CASE WHEN $64 = '' THEN NULL ELSE $64::timestamptz END,
    matrix_modified_dt = CASE WHEN $65 = '' THEN NULL ELSE $65::timestamptz END,
    property_association_fees = $66,
    showing_instructions_type = $67,
    special_notes = $68,
    tax_legal_description = $69,
    total_annual_expenses_include = $70,
    transaction_type = $71,
    virtual_tour_url_branded = $72,
    virtual_tour_url_unbranded = $73,
    active_option_contract_date = $74,
    keybox_type = $75,
    keybox_number = $76,
    close_date = CASE WHEN $77 = '' THEN NULL ELSE $77::timestamptz END,
    close_price = $78,
    back_on_market_date = $79,
    deposit_amount = $80,
    dom = NOW() - $81 * INTERVAL '1 DAY',
    cdom = NOW() - $82 * INTERVAL '1 DAY',
    buyers_agency_commission = $83,
    sub_agency_commission = $84,
    list_date = CASE WHEN $85 = '' THEN NULL ELSE $85::timestamptz END,
    updated_at = NOW(),
    showing_instructions = $86,
    appointment_phone = $87,
    appointment_phone_ext = $88,
    appointment_call = $89,
    owner_name = $90,
    seller_type = $91,
    occupancy = $92,
    private_remarks = $93,
    photos_checked_at = NULL
WHERE id = $94
