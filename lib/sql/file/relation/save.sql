INSERT INTO files_relations
(file, role, role_id)
SELECT file, role, role_id
FROM json_populate_recordset(NULL::files_relations, $1)

ON CONFLICT(file, role, role_id) DO UPDATE
SET deleted_at = NULL
WHERE files_relations.id = EXCLUDED.id
