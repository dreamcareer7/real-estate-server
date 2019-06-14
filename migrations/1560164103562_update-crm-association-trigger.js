const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'DROP TRIGGER delete_crm_association_after_delete_contact ON contacts',
  `CREATE TRIGGER delete_crm_association_after_delete_contact
    AFTER UPDATE ON contacts
    REFERENCING NEW TABLE AS deleted_contacts
    FOR EACH STATEMENT
    EXECUTE PROCEDURE delete_crm_association_by_contact();
  `,
  `CREATE OR REPLACE FUNCTION delete_crm_association_by_contact ()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        UPDATE
          crm_associations AS ca
        SET
          deleted_at = NOW()
        FROM
          deleted_contacts AS dc
        WHERE
          dc.deleted_at IS NOT NULL
          AND contact = dc.id;

        RETURN NULL;
      END;
    $$
  `,
  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
