CREATE VIEW role_files AS
  SELECT
    files_relations.file as id,
    files_relations.role,
    files_relations.role_id
  FROM files_relations
  JOIN files
    ON files_relations.file = files.id
  WHERE
    files.deleted_at IS NULL
    AND files_relations.deleted_at IS NULL