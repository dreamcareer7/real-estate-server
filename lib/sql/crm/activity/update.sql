UPDATE
    crm_activities
SET
    title=$2,
    "description"=$3,
    "timestamp"=$4,
    activity_type=$5,
    outcome=$6,
    searchable_field=COALESCE($2, '') || ' ' || COALESCE($3, ''),
    updated_at=now()
WHERE
    id = $1
    AND deleted_at IS NULL