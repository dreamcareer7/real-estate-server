const db = require('../../../../utils/db')

const Contact = require('../../../Contact/fast_filter')
const ContactBaseQueryBuilder = require('./contact_base')

const HEADER_MAP = {
  marketing_name: 'Marketing Name',
  full_street_name: 'Full Street Name',
  city: 'City',
  state: 'State',
  postcode: 'Zip Code'
}

class ContactExportQueryBuilder extends ContactBaseQueryBuilder {
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
    await this.authorize()

    const { ids } = await Contact.fastFilter(
      this.brand_id,
      this.user_id,
      this.filters,
      options
    )

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
        STDADDR_TO_JSON(address[1])->>'line1' AS full_street_name,
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
