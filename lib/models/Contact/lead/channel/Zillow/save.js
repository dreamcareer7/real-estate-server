const parseName = require('parse-full-name').parseFullName
const Slack = require('../../../../Slack')
const LtsLead = require('../../save')
const Context = require('../../../../Context')
const LeadChannel = {
  ...require('../get'),
  ...require('../update_counter'),
  ...require('./upsert')
}
/**
 * @param {import('../types').Zillow} zillowBody
 * @returns {import('../../types').ILtsLead}
 */

const mapZillowToContact = (zillowBody) => {
  const { first, last } = parseName(zillowBody?.ContactMessage?.ContactInfo?.ContactName || '')
  
  const contact = {
    first_name: first,
    last_name: last,
    email: zillowBody?.ContactMessage?.ContactInfo?.ContactEmail,
    phone_number: zillowBody?.ContactMessage.ContactInfo?.ContactPhone,
    company: '',
    tag: '',
    note: `
    Lead captured from Zillow, with the message:
    ${zillowBody?.ContactMessage?.ContactInfo?.ContactMessage || ''}
    ${zillowBody?.ContactMessage?.PropertyInfo?.MLSNumber ? `on property ${zillowBody?.ContactMessage?.PropertyInfo?.MLSNumber}` : ''}
    `,
    address: '',
    message: '',
    lead_source: 'Zillow',
    listing_number: zillowBody?.ContactMessage?.PropertyInfo?.MLSNumber,
    agent_mlsid: '',
    office_mlsid: '',
    lead_channel: zillowBody?.ContactMessage?.ContactInfo?.PartnerAgentIdentifier,
  }

  return contact
}

/**
 * @param {import('../types').Zillow_Sns} zillowJSON
 */

const save = async (zillowJSON) => {
  try {
    Context.log('start processing Zillow response')
   
    /** @type {import('../types').Zillow} */
    let zillowMessage
    try {
      zillowMessage = JSON.parse(zillowJSON.Message)
      Context.log(JSON.stringify(zillowMessage, null, 2))
    } catch (error) {
      const err = Error.Generic(`Can not parse Zillow Json with value '${zillowJSON}'`)
      err.retry = false
      throw err
    }

    const lead = mapZillowToContact(zillowMessage)
    const leadChannelID = lead.lead_channel

    if (!leadChannelID) {
      const err = Error.Generic(`Lead Channel ID is not set in Zillow data '${JSON.stringify(zillowMessage, null, 2)}'`)
      err.retry = false
      throw err
    }

    // it throws an error if it is not found
    const leadChannel = await LeadChannel.get(leadChannelID)

    if (leadChannel.deleted_at) {
      const err = Error.Generic(`Lead Channel with id '${leadChannel.id}' is deleted`)
      err.retry = false
      throw err
    }

    if (leadChannel.source_type !== 'Zillow') {
      const err = Error.Generic(`Expect lead Channel with id '${leadChannel.id}' has source type of Zillow but has ${leadChannel.source_type}`)
      err.retry = false
      throw err
    }

    const { contact, isUpdated } = await LtsLead.saveAndNotify(
      {
        brand: leadChannel.brand,
        protocol: 'JSON',
        user: leadChannel.user,
        notify: true,
      },
      lead
    )

    if (!isUpdated) {
      await LeadChannel.updateCounter(leadChannel.id)
    }

    await LeadChannel.upsertZillowJson(contact.id, JSON.stringify(zillowJSON))
    
    Context.log(`Zillow Lead is captured contact ${JSON.stringify(contact, null, 2)}`)

  } catch (error) {
    Context.error(error)
    Context.log(`there is an error while capturing a lead from zillow ${error.message}`)
    Slack.send({
      channel: '6-support',
      text: `there is an error while capturing a lead from zillow ${error.message}`,
      emoji: ':skull:',
    })
    throw error
  }

  return
}

// TODO [] datadog

module.exports = {
  save,
}
