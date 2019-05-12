const _ = require('lodash')
const sq = require('@rechat/squel').useFlavour('postgres')

const belt = require('../../utils/belt')
const db = require('../../utils/db')

const BrandEmail = require('../Brand/email')
const EmailCampaign = require('../Email/campaign')
const ContactSummary = require('../Contact/summary')
const Context = require('../Context')
const Orm = require('../Orm')

class FlowEmail {
  /**
   * @param {UUID} brand_id
   * @param {UUID} user_id
   * @param {UUID[]} brand_email_ids
   * @param {IFlowEmailInput[]} emails
   */
  async create(brand_id, user_id, brand_email_ids, emails) {
    Context.log(`Creating ${emails.length} emails`)
    if (emails.length < 1) return []

    const brand_emails = await BrandEmail.getAll(brand_email_ids)
    const be_by_id = _.keyBy(brand_emails, 'id')

    const contacts = await ContactSummary.getAll(emails.map(e => e.contact))
    const cs_by_id = _.keyBy(contacts, 'id')

    const valid_emails = emails.filter(e => Array.isArray(cs_by_id[e.contact].email))

    if (valid_emails.length < 1) return []

    const campaigns = valid_emails.map(/** @returns {IEmailCampaignInput} */e => ({
      created_by: user_id,
      brand: brand_id,
      due_at: e.is_automated ? belt.epochToDate(e.due_date).toISOString() : null,
      from: user_id,
      html: be_by_id[e.origin].body,
      subject: be_by_id[e.origin].subject,
      to: [{
        contact: e.contact,
        email: /** @type {string} */(cs_by_id[e.contact].email)
      }]
    }))

    const campaign_ids = await EmailCampaign.createMany(campaigns)

    const data = valid_emails.map((email, i) => ({
      email: campaign_ids[i],
      origin: email.origin,
      created_by: user_id
    }))

    const q = sq.insert({ autoQuoteFieldNames: true })
      .into('flows_emails')
      .setFieldsRows(data)
      .returning('id')

    // @ts-ignore
    q.name = 'flow/email/create'

    return db.selectIds(q, [])
  }
}

const Model = new FlowEmail

Orm.register('flow_email', 'FlowEmail', Model)

module.exports = Model
