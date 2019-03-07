const _ = require('lodash')

const Contact = require('./Contact')
const ContactEmail = require('./Contact/email')
const ContactSummary = require('./Contact/summary')
const Email = require('./Email')
const Orm = require('./Orm')
const User = require('./User')
const Task = require('./CRM/Task')

const db = require('../utils/db')

function isPropertyPresent(k) {
  return o => o.hasOwnProperty(k)
}

class EmailCampaign {
  async getAll(ids) {
    return db.select('email/campaign/get', [ids])
  }

  async get(id) {
    const campaigns = await this.getAll([id])

    if (campaigns.length < 1)
      throw Error.ResourceNotFound(`Email Campaign ${id} not found`)

    return campaigns[0]
  }

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

  async _insert(campaign) {
    const { rows } = await db.query.promise('email/campaign/insert', [
      campaign.created_by,
      campaign.brand,
      campaign.subject,
      campaign.include_signature || false,
      campaign.html
    ])

    return rows[0].id
  }

  /**
   *
   * @param {IEmailCampaign} campaign
   * @param {UUID} brand_id
   * @returns {Promise<UUID[]>} Ids of contacts that will receive the campaign
   */
  async create(campaign, brand_id) {

    const { from, to, subject, html, attachments } = campaign

    const user = await User.get(from)

    const summaries = await this._filterContacts(to, brand_id)
    const by_id = _.keyBy(summaries.filter(c => c.email), 'id')

    const campaign_id = await this._insert(campaign)

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
        html,
        campaign: campaign_id,
        attachments
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

    const contacts = contact_emails.map(ce => ce.contact)

    const associations = contact_emails.map(ce => {
      return {
        association_type: 'contact',
        contact: ce.contact
      }
    })

    if (contacts.length > 0) {
      await Task.create({
        title: campaign.subject,
        status: 'DONE',
        task_type: 'Email',
        due_date: Date.now() / 1000,
        associations,
        assignees: [campaign.from]
      }, campaign.from, brand_id)
    }

    return this.get(campaign_id)
  }
}

const Model = new EmailCampaign()
Orm.register('email_campaign', 'EmailCampaign', Model)

module.exports = Model
