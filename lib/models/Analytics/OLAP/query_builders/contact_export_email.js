const db = require('../../../../utils/db')
const Contact = require('../../../Contact')

const QueryBuilder = require('../query')

const HEADER_MAP = {
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'E-mail Address'
}

class ContactExportQueryBuilder extends QueryBuilder {
  constructor(drilldowns, filters, user_id, brand_id) {
    // @ts-ignore
    super({}, drilldowns, filters, user_id, brand_id)
  }

  addFilter(filter) {
    this.filters.push(filter)
  }

  async headerMapper(row) {
    return Object.keys(row).map(k => HEADER_MAP[k])
  }

  /**
   * @returns {Promise<any[]>}
   */
  async facts(options = {}) {
    const { ids } = await Contact.fastFilter(this.brand_id, this.filters, options)

    const sql = `
      SELECT
        first_name,
        last_name,
        email
      FROM
        (
          (
            SELECT
              id,
              first_name,
              last_name,
              email[1] AS email
            FROM
              contacts
            WHERE
              array_length(email, 1) > 0
              AND id = ANY($1::uuid[])
          ) UNION ALL (
            SELECT
              id,
              partner_first_name AS first_name,
              partner_last_name AS last_name,
              partner_email AS email
            FROM
              contacts
            WHERE
              partner_email IS NOT NULL
              AND id = ANY($1::uuid[])
          )
        ) AS c
        JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON c.id = t.cid
      ORDER BY
        t.ord
    `
    const res = await db.executeSql.promise(sql, [
      Array.isArray(ids) ? ids : this.brand_id
    ])

    return res.rows
  }
}

module.exports = ContactExportQueryBuilder
