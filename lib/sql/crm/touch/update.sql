UPDATE
    touches
SET
    "description"=$2,
    "timestamp"=$3,
    activity_type=$4,
    outcome=$5,
    updated_at=now()
WHERE
    id = $1
    AND deleted_at IS NULL