const db = require('../../../../utils/db')

const QueryBuilder = require('../query')

const Contact = require('../../../Contact')

const HEADER_MAP = {
  marketing_name: 'Marketing Name',
  full_street_name: 'Full Street Name',
  city: 'City',
  state: 'State',
  postcode: 'Zip Code'
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
        COALESCE(
          marketing_name,
          CASE
            WHEN partner_name IS NULL THEN 
              array_to_string(ARRAY[
                title,
                display_name
              ], ' ')
            ELSE
              array_to_string(ARRAY[
                title,
                display_name,
                'and',
                partner_name
              ], ' ')
          END
        ) AS marketing_name,
        array_to_string(ARRAY[
          INITCAP((address[1]).building),
          INITCAP((address[1]).house_num),
          INITCAP((address[1]).predir),
          INITCAP((address[1]).qual),
          INITCAP((address[1]).pretype),
          INITCAP((address[1]).name),
          INITCAP((address[1]).suftype),
          INITCAP((address[1]).sufdir),
          INITCAP((address[1]).ruralroute),
          INITCAP((address[1]).extra),
          CASE
            WHEN (address[1]).unit IS NULL THEN NULL
            WHEN (address[1]).unit = '' THEN NULL
            ELSE 'Unit ' || (REPLACE((address[1]).unit, '# ', '#'))
          END,
          CASE
            WHEN (address[1]).box IS NULL THEN NULL
            WHEN (address[1]).box = '' THEN NULL
            ELSE 'Box ' || INITCAP((address[1]).box)
          END
        ], ' ') AS full_street_name,
        INITCAP(address[1].city) AS city,
        INITCAP(address[1].state) AS state,
        INITCAP(address[1].postcode) AS postcode
      FROM
        contacts
        JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON contacts.id = t.cid
      WHERE
        array_length(address, 1) > 0
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
