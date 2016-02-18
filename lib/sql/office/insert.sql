  INSERT INTO offices(board,
    email,
    fax,
    office_mui,
    office_mls_id,
    license_number,
    address,
    care_of,
    city,
    postal_code,
    postal_code_plus4,
    state,
    matrix_unique_id,
    matrix_modified_dt,
    mls,
    mls_id,
    mls_provider,
    nar_number,
    contact_mui,
    contact_mls_id,
    long_name,
    name,
    status,
    phone,
    other_phone,
    st_address,
    st_city,
    st_country,
    st_postal_code,
    st_postal_code_plus4,
    st_state,
    url)
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
        CASE WHEN $14 = '' THEN NULL ELSE $14::timestamptz END,
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
        $32)
ON CONFLICT (matrix_unique_id) DO NOTHING
RETURNING id
