const expect = require('chai').expect

const Brand = require('../Brand/access')
const BrandEvent = require('../Brand/event/get')
const Contact = require('../Contact/access')
const EmailCampaign = require('../Email/campaign/get')

/**
 * @param {import('./trigger').ITriggerInput} trigger 
 */
async function validateForCreate(trigger) {
  expect(trigger.brand, 'brand not specified').be.uuid
  expect(trigger.created_by, 'created_by not specified').be.uuid
  expect(trigger.user, 'user not specified').be.uuid
  expect(trigger.event_type, 'event_type not specified').not.to.be.empty

  expect(trigger.action, 'action must be either "create_event" or "schedule_email"').be.oneOf(['create_event', 'schedule_email'])

  if (trigger.action === 'create_event') {
    expect(trigger.brand_event, 'brand_event not specified for create_event action').be.uuid
  }

  if (trigger.action === 'schedule_email') {
    expect(trigger.campaign, 'campaign id not specified for schedule_email action').be.uuid
  }

  if (!trigger.contact) {
    expect(trigger.deal, 'either a contact or a deal must be specified for a trigger').be.uuid
  }

  // Check user access to trigger's brand
  await Brand.limitAccess({ brand: trigger.brand, user: trigger.user })

  // Check campaign's brand compatibility
  if (trigger.action === 'schedule_email') {
    const campaign = await EmailCampaign.get(trigger.campaign)
    expect(campaign.brand).to.be.equal(trigger.brand, 'Campaign is not accessible from the specified brand')
    expect(campaign.due_at, 'Specified email campaign is already scheduled').to.be.null
    expect(campaign.executed_at, 'Specified email campaign is already executed').to.be.null
  }

  // Check BrandEvent's brand compatibility
  if (trigger.action === 'create_event') {
    const brand_event = await BrandEvent.get(trigger.brand_event)
    expect(brand_event.brand).to.be.equal(trigger.brand, 'BrandEvent is not accessible from the specified brand')
  }

  if (trigger.contact) {
    const accessIndex = await Contact.hasAccess(trigger.brand, trigger.user, 'read', [trigger.contact])
    expect(accessIndex.get(trigger.contact), 'Contact is not accessible from the specified brand and user').to.be.true
  }
}

/**
 * @param {import('./trigger').ITriggerUpdateInput} data 
 * @param {import('./trigger').IStoredTrigger} trigger 
 */
async function validateForUpdate(data, trigger) {
  expect(data.user, 'user not specified').be.uuid
  expect(data.event_type, 'event_type not specified').not.to.be.empty

  await Brand.limitAccess({ brand: trigger.brand, user: data.user })

  if (trigger.action === 'create_event') {
    expect(data.brand_event, 'brand_event not specified for create_event action').be.uuid

    const brand_event = await BrandEvent.get(data.brand_event)
    expect(brand_event.brand).to.be.equal(trigger.brand, 'BrandEvent is not accessible from the specified brand')
  }

  if (trigger.action === 'schedule_email') {
    expect(trigger.campaign, 'campaign id not specified for schedule_email action').be.uuid

    const campaign = await EmailCampaign.get(trigger.campaign)
    expect(campaign.brand).to.be.equal(trigger.brand, 'Campaign is not accessible from the specified brand')
    expect(campaign.executed_at, 'Specified email campaign is already executed').to.be.null
  }
}

module.exports = {
  validateForCreate,
  validateForUpdate,
}
