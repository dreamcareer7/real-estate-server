'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'DROP FUNCTION user_brands(uuid)',
  `CREATE OR REPLACE FUNCTION user_brands("user" uuid, roles text[]) RETURNS TABLE(
  brand uuid
)
AS
$$
  WITH roles AS (
    SELECT DISTINCT brands_roles.brand as brand FROM brands_users
    JOIN brands_roles ON brands_users.role = brands_roles.id
    WHERE brands_users.user = $1
    AND (
      CASE
        WHEN $2 IS NULL THEN TRUE
        ELSE brands_roles.acl && $2
      END
    )
  )

SELECT brand_children(roles.brand) FROM roles
$$
LANGUAGE sql;`,
  `CREATE OR REPLACE FUNCTION get_deals_with_contacts(user_id uuid, contact_ids uuid[])
RETURNS TABLE (
  deal uuid,
  contact uuid
)
LANGUAGE SQL
STABLE
AS $$
  WITH emails AS (
    SELECT text
    FROM contacts_attributes AS ca
    WHERE
      attribute_type = 'email'
      AND text <> ''
      AND deleted_at IS NULL
      AND contact = ANY(contact_ids)
  ),
  phones AS (
    SELECT text
    FROM contacts_attributes AS ca
    WHERE
      attribute_type = 'phone_number'
      AND text <> ''
      AND deleted_at IS NULL
      AND contact = ANY(contact_ids)
  ),
  contacts_users AS (
    SELECT cu.user_id AS "user", cu.contact_id AS "contact" FROM get_users_for_contacts(contact_ids) AS cu
  ),
  roles_with_deals AS (
    SELECT
      deals.id,
      dr.email,
      dr.phone_number,
      dr.user
    FROM deals_roles AS dr
    INNER JOIN deals ON deals.id = dr.deal
    INNER JOIN user_brands(user_id, NULL) ub USING (brand)
    WHERE
      dr.deleted_at IS NULL
      AND (
        dr.user = ANY(SELECT contacts_users.user FROM contacts_users)
        OR lower(dr.email) = ANY(SELECT text FROM emails)
        OR dr.phone_number = ANY(SELECT text FROM phones)
      )
  )
  (
    SELECT
      roles_with_deals.id AS deal,
      contacts_users.contact
    FROM
      contacts_users JOIN roles_with_deals USING ("user")
  )
  UNION (
    SELECT
      roles_with_deals.id AS deal,
      contacts_attributes.contact
    FROM
      contacts_attributes
      INNER JOIN roles_with_deals
        ON roles_with_deals.email = contacts_attributes.text
    WHERE contacts_attributes.deleted_at IS NULL
      AND contacts_attributes.text <> ''
      AND contacts_attributes.attribute_type = 'email'
      AND contacts_attributes.contact = ANY(contact_ids)
  )
  UNION (
    SELECT
      roles_with_deals.id AS deal,
      contacts_attributes.contact
    FROM
      contacts_attributes
      INNER JOIN roles_with_deals
        ON roles_with_deals.phone_number = contacts_attributes.text
    WHERE contacts_attributes.deleted_at IS NULL
      AND contacts_attributes.text <> ''
      AND contacts_attributes.attribute_type = 'phone'
      AND contacts_attributes.contact = ANY(contact_ids)
  )
$$`
]

const down = []

const runAll = (sqls, next) => {
  db.conn((err, client, release) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      release()
      next(err)
    })
  })
}

const run = (queries) => {
  return (next) => {
    runAll(queries, next)
  }
}

exports.up = run(up)
exports.down = run(down)
