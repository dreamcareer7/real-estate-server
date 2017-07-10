SELECT "user" FROM brands_users WHERE role IN (
  SELECT role FROM brands_roles_tags WHERE tag IN ($1)
)