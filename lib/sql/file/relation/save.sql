INSERT INTO files_relations
(file, role, role_id)
SELECT file, role, role_id
FROM json_populate_recordset(NULL::files_relations, $1)
