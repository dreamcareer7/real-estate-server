INSERT INTO crm_activities (
    created_by,
    brand,
    title,
    "description",
    "timestamp",
    activity_type,
    outcome,
    searchable_field
)
VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    COALESCE($3, '') || ' ' || COALESCE($4, '')
)
RETURNING id