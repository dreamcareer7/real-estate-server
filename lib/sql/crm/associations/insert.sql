INSERT INTO crm_associations (
    association_type,
    crm_task,
    crm_activity,
    -- contact_note,
    contact,
    deal,
    listing
)
VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6
)
RETURNING id