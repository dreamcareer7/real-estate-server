WITH rec AS (
    SELECT referred_shortlist, object
    FROM recommendations
    WHERE id = $1
    )
UPDATE recommendations
SET updated_at = NOW()
WHERE id IN (
    SELECT id
    FROM recommendations
    INNER JOIN rec ON
        recommendations.referred_shortlist = rec.referred_shortlist AND
        recommendations.object = rec.object
    );
