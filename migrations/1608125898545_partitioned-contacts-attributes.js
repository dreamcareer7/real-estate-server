const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'DROP VIEW IF EXISTS contacts_attributes_with_name',
  'DROP VIEW IF EXISTS triggers_due',
  'DROP VIEW IF EXISTS analytics.calendar',
  'ALTER TABLE contacts_attributes ADD COLUMN data_type attribute_data_types NOT NULL DEFAULT \'text\'',
  'ALTER TABLE contacts_attributes DROP COLUMN number',
  'ALTER TABLE contacts_attributes DROP CONSTRAINT contacts_attributes_pkey CASCADE',
  'ALTER TABLE contacts_attributes ALTER COLUMN date TYPE date USING (date::date)',

  'DROP TRIGGER update_tags_after_attr_insert ON contacts_attributes',
  'DROP TRIGGER update_tags_after_attr_update ON contacts_attributes',

  `UPDATE
    contacts_attributes
  SET
    data_type = 'date'::attribute_data_types
  WHERE
    date IS NOT NULL`,

  'ALTER TABLE contacts_attributes RENAME TO contacts_attributes_text',

  `CREATE TABLE contacts_attributes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    contact uuid NOT NULL REFERENCES contacts ( id ),

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    created_by uuid NOT NULL REFERENCES users ( id ),
    updated_by uuid REFERENCES users ( id ),
    deleted_by uuid REFERENCES users ( id ),

    created_within text,
    updated_within text,
    deleted_within text,

    created_for contact_action_reason,
    updated_for contact_action_reason,
    deleted_for contact_action_reason,

    attribute_def uuid NOT NULL REFERENCES contacts_attribute_defs ( id ),
    attribute_type text,
    data_type attribute_data_types NOT NULL DEFAULT 'text',
    text text,
    date date,

    label text,
    is_primary boolean NOT NULL DEFAULT false,
    index smallint,
    is_partner boolean NOT NULL,

    PRIMARY KEY ( id, data_type )
  ) PARTITION BY LIST ( data_type )
  `,

  `ALTER TABLE contacts_attributes
    ATTACH PARTITION contacts_attributes_text DEFAULT`,

  `CREATE TABLE contacts_attributes_date (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    contact uuid NOT NULL REFERENCES contacts ( id ),

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    created_by uuid NOT NULL REFERENCES users ( id ),
    updated_by uuid REFERENCES users ( id ),
    deleted_by uuid REFERENCES users ( id ),

    created_within text,
    updated_within text,
    deleted_within text,

    created_for contact_action_reason,
    updated_for contact_action_reason,
    deleted_for contact_action_reason,

    attribute_def uuid NOT NULL REFERENCES contacts_attribute_defs ( id ),
    attribute_type text,
    data_type attribute_data_types DEFAULT 'text',
    text text,
    date date,

    label text,
    is_primary boolean NOT NULL DEFAULT false,
    index smallint,
    is_partner boolean NOT NULL,

    PRIMARY KEY ( id, data_type ),
    CHECK (date IS NOT NULL AND text IS NULL)
  )`,

  `WITH x AS (
    DELETE FROM contacts_attributes_text WHERE date IS NOT NULL RETURNING *
  )
  INSERT INTO contacts_attributes_date (
    id,
    contact,
    created_at,
    updated_at,
    deleted_at,
    label,
    is_primary,
    index,
    text,
    date,
    created_by,
    attribute_def,
    attribute_type,
    updated_by,
    deleted_by,
    is_partner,
    created_within,
    updated_within,
    deleted_within,
    created_for,
    updated_for,
    deleted_for,
    data_type
  )
    SELECT * FROM x`,

  'ALTER TABLE contacts_attributes ATTACH PARTITION contacts_attributes_date FOR VALUES IN (\'date\')',
  'ALTER TABLE contacts_attributes DETACH PARTITION contacts_attributes_text',
  'ALTER TABLE contacts_attributes ATTACH PARTITION contacts_attributes_text FOR VALUES IN (\'text\')',

  'CREATE INDEX contacts_attributes_attribute_type_idx ON contacts_attributes (attribute_type)',
  'CREATE INDEX contacts_attributes_contact_idx ON contacts_attributes (contact)',

  'CREATE INDEX contacts_attributes_date_date_idx ON contacts_attributes_date (date)',

  `CREATE TRIGGER update_tags_after_attr_insert
    AFTER INSERT ON contacts_attributes
    REFERENCING NEW TABLE AS new_attrs
    FOR EACH STATEMENT
    EXECUTE PROCEDURE add_new_tags_from_attributes();
  `,

  `CREATE TRIGGER update_tags_after_attr_update
    AFTER UPDATE ON contacts_attributes
    REFERENCING NEW TABLE AS new_attrs
    FOR EACH STATEMENT
    EXECUTE PROCEDURE add_new_tags_from_attributes();
  `,

  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
