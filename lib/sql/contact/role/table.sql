CREATE TYPE contact_role AS ENUM (
  'owner',
  'assignee'
);

CREATE TABLE contacts_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand uuid NOT NULL REFERENCES brands(id),
  contact uuid NOT NULL REFERENCES contacts(id),
  "user" uuid NOT NULL REFERENCES users(id),
  role contact_role NOT NULL,

  created_at timestamp NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamp DEFAULT clock_timestamp(),
  deleted_at timestamp,
  created_by uuid REFERENCES users (id),
);
