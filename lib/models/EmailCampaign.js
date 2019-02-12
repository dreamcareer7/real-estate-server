const _ = require('lodash')

const Contact = require('./Contact')
const ContactEmail = require('./Contact/email')
const ContactSummary = require('./Contact/summary')
const Email = require('./Email')
const Orm = require('./Orm')
const User = require('./User')

function isPropertyPresent(k) {
  return o => o.hasOwnProperty(k)
}

class EmailCampaign {
  _getFilters(to) {
    const tags = to
      .filter(/** @type {TIsTagPresent} */ (isPropertyPresent('tag')))
      .map(t => t.tag)
    const lists = to
      .filter(/** @type {TIsListPresent} */ (isPropertyPresent('list')))
      .map(t => t.list)

    /** @type {IContactAttributeFilter[]} */
    const filters = []

    if (tags.length > 0) {
      filters.push({
        attribute_type: 'tag',
        value: tags,
        operator: 'any'
      })
    }

    /** @type {IContactFilterOptions} */
    const query = {}

    if (lists.length > 0) {
      query.lists = lists
    }

    return {
      filters,
      query
    }
  }

  /**
   * @param {IEmailRecipientInput[]} to
   * @param {UUID} brand_id
   */
  async _filterContacts(to, brand_id) {
    if (to.every(x => !x.hasOwnProperty('tag') && !x.hasOwnProperty('list'))) return []

    const {filters, query} = this._getFilters(to)

    const filter_res = await Contact.fastFilter(brand_id, filters, query)
    const contact_ids = Array.from(filter_res.ids)
    return ContactSummary.getAll(contact_ids)
  }

  /**
   *
   * @param {IEmailCampaign} campaign
   * @param {UUID} brand_id
   * @returns {Promise<UUID[]>} Ids of contacts that will receive the campaign
   */
  async create({ from, to, subject, html }, brand_id) {
    const user = await User.get(from)

    const summaries = await this._filterContacts(to, brand_id)
    const by_id = _.keyBy(summaries.filter(c => c.email), 'id')

    const email_recipients = to.filter(
      /** @type {TIsEmailPresent} */ (x =>
        !x.hasOwnProperty('tag') &&
        !x.hasOwnProperty('list') &&
        x.hasOwnProperty('email'))
    )

    const recipients = _(email_recipients)
      .concat(
        Object.keys(by_id).map(id => ({
          email: by_id[id].email,
          contact: id
        }))
      )
      .uniqBy('email')
      .uniqBy('contact')
      .value()

    const emails = recipients.map(
      /** @returns {IEmail} */ rcp => ({
        domain: Email.MARKETING,
        to: rcp.email,
        from: `${user.display_name} <${user.email}>`,
        subject,
        html
      })
    )

    const email_ids = await Email.createAll(emails)

    const contact_emails = recipients
      .filter(
        /** @type {TIsRequirePropPresent<IEmailRecipientEmailInput, 'contact'>} */ (isPropertyPresent(
          'contact'
        ))
      )
      .map(
        /** @returns {IContactEmail} */ (rcp, i) => ({
          user: from,
          contact: rcp.contact,
          email: email_ids[i]
        })
      )

    await ContactEmail.createAll(contact_emails)

    return contact_emails.map(ce => ce.contact)
  }
}

const Model = new EmailCampaign()
Orm.register('email_campaign', 'EmailCampaign', Model)

module.exports = Model
