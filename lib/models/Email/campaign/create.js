const _ = require('lodash')
const Mjml = require('./mjml')

const db     = require('../../../utils/db')
const Context = require('../../Context')

const Template = require('../../Template')
const TemplateInstance = require('../../Template/instance/get')

const htmlToText = require('../html-to-text')

const { notify } = require('./notify')
const { validate } = require('./validate')
const { CREATE_EVENT } = require('./constants')

const { insertAttachments } = require('./attachment/campaign')
const EmailCampaignRecipient = require('./recipient/save')


/**
 * @param {IEmailCampaignInput[]} campaigns
 */
const insert = async campaigns => {
  const belt = require('../../../utils/belt')
  
  belt.footprint([[`${campaigns.length} Campaigns`]], null, 'Campaign.insert')

  const htmlToTextTime = belt.measureTime(() => {
    campaigns.forEach(campaign => {
      if (!campaign.text)
        campaign.text = htmlToText(campaign.html)

      /*
       * Mailgun doesn't allow sending an email with no text and no html.
       * However, user's tend to do that (eg send an attachment with no body)
       * Also, Mailgun doesn't allow setting them as "". It needs at least a space.
       * More info at server#1381
       */
      if (_.isEmpty(campaign.text) && _.isEmpty(campaign.html))
        campaign.text = ' '
    })    
  })

  let campaignsJson = ''
  const stringifyTime = belt.measureTime(() => {
    campaignsJson = JSON.stringify(campaigns)    
  })
  
  Context.log(`Campaign.insert: campaignsJson.length=${campaignsJson.length}, htmlToTextTime=${htmlToTextTime}, stringifyTime=${stringifyTime}`)
  
  return db.selectIds('email/campaign/insert', [campaignsJson])
}

/**
 * @param {IEmailCampaignInput[]} campaigns
 */
const createMany = async (campaigns) => {
  require('../../../utils/belt').footprint([campaigns], this, 'createMany')
  for(const campaign of campaigns)
    await validate(campaign)

  const template_instance_ids = campaigns
    .map(campaign => campaign.template)
    .filter(Boolean)

  const template_instances = await TemplateInstance.getAll(template_instance_ids)
  const template_ids = template_instances.map(t => t.template)

  const templates = await Template.getAll(template_ids)
  const indexed_templates = _.keyBy(templates, 'id')

  const rendered_instances = _.chain(template_instances)
    .keyBy('id')
    .map(instance => {
      const template = indexed_templates[instance.template]

      const { html } = instance
      const { mjml } = template

      return mjml ? Mjml(html) : html
    })
    .value()

  campaigns.forEach((campaign, i) => {
    if (!campaign.template)
      return

    campaign.html = rendered_instances[campaign.template]
  })

  const ids = await insert(campaigns)

  campaigns.forEach((campaign, i) => {
    campaign.id = ids[i]
  })

  await EmailCampaignRecipient.insertForCampaigns(campaigns)

  await insertAttachments(/** @type {IEmailCampaign[]} */(campaigns))

  notify(
    CREATE_EVENT,
    campaigns[0].created_by,
    campaigns[0].brand,
    ids
  )

  return ids
}

module.exports = {
  createMany,
}
