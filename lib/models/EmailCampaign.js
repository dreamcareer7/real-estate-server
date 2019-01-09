const _ = require('lodash')

const Contact = require('./Contact')
const ContactEmail = require('./Contact/email')
const ContactSummary = require('./Contact/summary')
const Email = require('./Email')
const Orm = require('./Orm')

class EmailCampaign {
  /**
   * 
   * @param {IEmailCampaign} campaign 
   * @param {UUID} brand_id 
   * @returns {Promise<UUID[]>} Ids of contacts that will receive the campaign
   */
  async create({ from, to, subject, html }, brand_id) {
    const tags = to.filter(x => x.tag).map(x => x.tag)
    const lists = to.filter(x => x.list).map(x => x.list)

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

    const filter_res = await Contact.fastFilter(brand_id, filters, query)

    const contact_ids = Array.from(filter_res.ids)
    const summaries = await ContactSummary.getAll(contact_ids)
    const by_id = _.keyBy(summaries.filter(c => c.email), 'id')

    /** @type {IEmailRecipient[]} */
    const recipients = _(to)
      .filter(x => !x.hasOwnProperty('tag') && !x.hasOwnProperty('list') && x.hasOwnProperty('email'))
      .concat(Object.keys(by_id).map(id => ({
        email: by_id[id].email,
        contact: id
      })))
      .uniqBy('email')
      .uniqBy('contact')
      .value()
    
    /** @type {IEmail[]} */
    const emails = recipients.map(rcp => ({
      domain: Email.MARKETING,
      to: rcp.email,
      from,
      subject,
      html
    }))

    const email_ids = await Email.createAll(emails)

    /** @type {IContactEmail[]} */
    const contact_emails = recipients.filter(rcp => rcp.contact).map((rcp, i) => ({
      user: from,
      contact: rcp.contact,
      email: email_ids[i]
    }))

    await ContactEmail.createAll(contact_emails)

    return contact_emails.map(ce => ce.contact)
  }
}

const Model = new EmailCampaign
Orm.register('email_campaign', 'EmailCampaign', Model)

module.exports = Model
