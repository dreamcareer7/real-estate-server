INSERT INTO crm_activities (
    created_by,
    brand,
    "description",
    "timestamp",
    activity_type,
    outcome
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