const _ = require('lodash')

const promisify = require('../../utils/promisify.js')
const db = require('../../utils/db.js')
const Orm = require('../Orm')

const getQuery = require('../../sql/contact/summary/get')

class ContactSummary {
  /**
   * Get contact summaries by id
   * @param {UUID[]} ids
   * @returns {Promise<IContactSummary[]>}
   */
  static async getAll(ids, user_id) {
    const { rows } = await promisify(db.executeSql)(getQuery(ids), [])
    return rows
  }

  static getDisplayName(summary) {
    const {
      nickname,
      first_name,
      last_name,
      email,
      phone_number,
      company
    } = summary

    if (!_.isEmpty(first_name) && !_.isEmpty(last_name))
      return first_name + ' ' + last_name

    if (!_.isEmpty(nickname)) return nickname

    if (!_.isEmpty(first_name)) return first_name

    if (!_.isEmpty(last_name)) return last_name

    if (!_.isEmpty(company)) return company

    if (!_.isEmpty(email)) return email

    if (!_.isEmpty(phone_number)) return phone_number

    return 'Guest'
  }

  static getAbbreviatedDisplayName(summary) {
    const {
      nickname,
      first_name,
      email,
      phone_number,
      company
    } = summary

    if (!_.isEmpty(nickname)) return nickname

    if (!_.isEmpty(first_name)) return first_name

    if (!_.isEmpty(company)) return company

    if (!_.isEmpty(email)) return email

    if (!_.isEmpty(phone_number)) return phone_number

    return 'Guest'
  }

  static publicize(summary) {
    summary.display_name = ContactSummary.getDisplayName(summary)
    summary.abbreviated_display_name = ContactSummary.getAbbreviatedDisplayName(summary)
  }
}

Orm.register('contact_summary', 'ContactSummary', ContactSummary)

module.exports = ContactSummary
