const Slack = require('../../../../Slack')
const LtsLead = require('../../save')
const Context = require('../../../../Context')
const LeadChannel = {
  ...require('../get'),
  ...require('../update_counter'),
  ...require('./upsert'),
}
/**
 * @param {import('../types').Realtor} realtorBody
 * @returns {import('../../types').ILtsLead}
 */

const mapRealtorToContact = (realtorBody) => {
  const {
    first_name,
    last_name,
    email,
    phone,
    message: note,
  } = realtorBody.Lead.lead_info.lead_consumer_info
  const { partner_customer_id } = realtorBody.Lead.lead_info

  let mlsId = ''
  let mls_name = ''

  const propertyInfo = realtorBody.Lead.lead_info.lead_property_info || realtorBody.Lead.lead_property_info

  if (propertyInfo) {
    const { mls_id, mls_abbreviation } = propertyInfo
    mlsId = mls_id
    mls_name = mls_abbreviation
  }
  

  const contact = {
    first_name,
    last_name,
    email,
    phone_number: phone,
    company: '',
    tag: '',
    note: `
    Lead captured from Realtor, with the message:
    ${note || ''}

    on property ${mlsId} ${mls_name}`,
    address: '',
    message: '',
    lead_source: 'Realtor',
    listing_number: mlsId,
    agent_mlsid: '',
    office_mlsid: '',
    lead_channel: partner_customer_id,
  }

  return contact
}

/**
 * @param {import('../types').Realtor} realtorBody
 */

const save = async (realtorBody) => {
  try {
    Context.log('start processing Realtor response')
    let lead
    try {
      lead = mapRealtorToContact(realtorBody)
    } catch (error) {
      Context.log(error)
      const err = Error.Generic(
        `Error in mapping Realtor to contact '${JSON.stringify(realtorBody, null, 2)}'`
      )
      err.retry = false
      throw err
    }

    const leadChannelID = lead.lead_channel

    if (!leadChannelID) {
      const err = Error.Generic(
        `Lead Channel ID is not set in Realtor data '${JSON.stringify(realtorBody, null, 2)}'`
      )
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

    if (leadChannel.source_type !== 'Realtor') {
      const err = Error.Generic(
        `Expect lead Channel with id '${leadChannel.id}' has source type of Realtor but has ${leadChannel.source_type}`
      )
      err.retry = false
      throw err
    }

    const { contact, isUpdated } = await LtsLead.saveAndNotify(
      {
        brand: leadChannel.brand,
        protocol: 'JSON',
        user: leadChannel.user,
        notify: true,
        source: 'Realtor'
      },
      lead
    )

    if (!isUpdated) {
      await LeadChannel.updateCounter(leadChannel.id)
    }

    await LeadChannel.upsertRealtorJson(contact.id, JSON.stringify(realtorBody))

    Context.log(`Realtor Lead is captured contact ${JSON.stringify(contact, null, 2)}`)
  } catch (error) {
    Context.error(error)
    Context.log(`there is an error while capturing a lead from realtor ${error.message}`)
    Slack.send({
      channel: '6-support',
      text: `there is an error while capturing a lead from realtor ${error.message}`,
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
