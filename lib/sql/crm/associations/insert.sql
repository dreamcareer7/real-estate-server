INSERT INTO crm_associations (
    created_by,
    brand,
    association_type,
    crm_task,
    contact,
    deal,
    listing,
    email,
    index,
    metadata
)
VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    $9,
    $10
)
RETURNING id
