const { createContext } = require('../helper')
const zillowJson = require('./data/zillow.json')
const realtorJson1 = require('./data/realtor.json')
const realtorJson2 = require('./data/realtor.json')
const sql = require('../../../lib/utils/sql')

const UserHelper = require('../user/helper')
const BrandHelper = require('../brand/helper')
const { expect } = require('chai')
// const Context = require('../../../lib/models/Context')

const LeadChannel = {
  ...require('../../../lib/models/Contact/lead/channel/create'),
  ...require('../../../lib/models/Contact/lead/channel/get'),
  ...require('../../../lib/models/Contact/lead/channel/delete'),
  ...require('../../../lib/models/Contact/lead/channel/save'),
}

const Contact = {
  ...require('../../../lib/models/Contact/get'),
}

const getZillowContacts = async () => {
  const rows = await sql.select(`
        SELECT
          *
        FROM
          zillow_contacts
      `)
  return rows
}

const getRealtorContacts = async () => {
  const rows = await sql.select(`
        SELECT
          *
        FROM
          realtor_contacts
      `)
  return rows
}

const getContacts = async () => {
  const ids = await sql.selectIds(`
          SELECT
            id
          FROM
            contacts
        `)
  return Contact.getAll(ids)
}

async function setup({ sourceType = 'Zillow' }) {
  const user = await UserHelper.TestUser()

  const brand = await BrandHelper.create({
    roles: {
      Admin: [user.id],
    },
    checklists: [],
    contexts: [],
  })

  const id = await LeadChannel.create(
    {
      // @ts-ignore
      sourceType,
    },
    user.id,
    brand.id
  )

  return {
    leadChannelId: id,
    userId: user.id,
  }
}

const setLeachChannelIdForZillow = (leadChannelId) => {
  const jsonMessage = JSON.parse(zillowJson.Message)
  jsonMessage.ContactMessage.ContactInfo.PartnerAgentIdentifier = leadChannelId

  return {
    ...zillowJson,
    Message: JSON.stringify(jsonMessage),
  }
}

const setLeachChannelIdForRealtor = (json, leadChannelId) => {
  json.Lead.lead_info.partner_customer_id = leadChannelId
  return json
}

const saveZillowContact = async () => {
  const { leadChannelId } = await setup({})

  await LeadChannel.save({
    source: 'Zillow',
    ...setLeachChannelIdForZillow(leadChannelId),
  })

  const [leadChannel, zillowContacts, contacts] = await Promise.all([
    LeadChannel.get(leadChannelId),
    getZillowContacts(),
    getContacts(),
  ])


  if (leadChannel.capture_number !== 1) {
    throw new Error('capture_number is not updated')
  }

  if (!leadChannel.last_capture_date) {
    throw new Error('last_capture_date is not updated')
  }

  if (contacts?.length !== 1) {
    throw new Error(`expect contacts to be 1 but got ${contacts?.length}`)
  }

  if (zillowContacts?.length !== 1) {
    throw new Error(`expect zillow_contacts to be 1 but got ${zillowContacts?.length}`)
  }

  const targetZillowContact = zillowContacts[0]
  const targetContact = contacts[0]

  if (targetContact.lead_channel !== leadChannelId) {
    throw new Error(
      `expect contact.lead_channel to be ${leadChannelId} but got ${targetContact.lead_channel}`
    )
  }

  if (targetZillowContact.contact !== targetContact.id) {
    throw new Error(
      `expect zillow_contact.contact to be ${targetContact.id} but got ${targetZillowContact.contact}`
    )
  }
}

const updateZillowContact = async () => {
  const { leadChannelId } = await setup({})
  // create a new contact
  await LeadChannel.save({ source: 'Zillow', ...setLeachChannelIdForZillow(leadChannelId) })

  // update the contact if email and user and brand is exist
  await LeadChannel.save({ source: 'Zillow', ...setLeachChannelIdForZillow(leadChannelId) })

  const [leadChannel, zillowContacts, contacts] = await Promise.all([
    LeadChannel.get(leadChannelId),
    getZillowContacts(),
    getContacts(),
  ])

  if (zillowContacts?.length !== 1) {
    throw new Error(`Expect zillow_contacts has one row but it has ${zillowContacts?.length}`)
  }

  if (contacts?.length !== 1) {
    throw new Error(`Expect contacts has one row but it has ${contacts?.length}`)
  }

  if (leadChannel.capture_number !== 1) {
    throw new Error(
      `Expect lead_channel.capture_number is 1 one it got ${leadChannel.capture_number}`
    )
  }
}

const deletedLeadChannel = async () => {
  let err
  try {
    const { leadChannelId, userId } = await setup({})
    await LeadChannel.deleteById(leadChannelId, userId)
    // create a new contact
    await LeadChannel.save({ source: 'Zillow', ...setLeachChannelIdForZillow(leadChannelId) })
  } catch (error) {
    err = error
  }

  if (!err) {
    throw new Error('Expect throw an error if Lead channel is deleted')
  }
}

const invalidLeadChannelId = async () => {
  let err
  try {
    await setup({})
    await LeadChannel.save(zillowJson)
  } catch (error) {
    err = error
  }
  if (!err) {
    throw new Error('Expect throw an error with invalid channel id')
  }
}

const invalidLeadChannelSource = async () => {
  let err
  try {
    const { leadChannelId } = await setup({ sourceType: 'Realtor' })

    await LeadChannel.save(setLeachChannelIdForZillow(leadChannelId))
  } catch (error) {
    err = error
  }

  if (!err) {
    throw new Error('Expect throw an error with invalid channel source')
  }
}

const saveRealtorContact = async (json) => {
  const { leadChannelId } = await setup({ sourceType: 'Realtor' })

  await LeadChannel.save({ source: 'Realtor', ...setLeachChannelIdForRealtor(json, leadChannelId) })

  const [leadChannel, realtorContacts, contacts] = await Promise.all([
    LeadChannel.get(leadChannelId),
    getRealtorContacts(),
    getContacts(),
  ])


  if (leadChannel.capture_number !== 1) {
    throw new Error('capture_number is not updated')
  }

  if (!leadChannel.last_capture_date) {
    throw new Error('last_capture_date is not updated')
  }

  if (contacts?.length !== 1) {
    throw new Error(`expect contacts to be 1 but got ${contacts?.length}`)
  }

  if (realtorContacts?.length !== 1) {
    throw new Error(`expect zillow_contacts to be 1 but got ${realtorContacts?.length}`)
  }

  const targetRealtorContact = realtorContacts[0]
  const targetContact = contacts[0]

  if (targetContact.lead_channel !== leadChannelId) {
    throw new Error(
      `expect contact.lead_channel to be ${leadChannelId} but got ${targetContact.lead_channel}`
    )
  }

  if (targetRealtorContact.contact !== targetContact.id) {
    throw new Error(
      `expect zillow_contact.contact to be ${targetContact.id} but got ${targetRealtorContact.contact}`
    )
  }
}

const saveRealtorContactBasedOnFirstSchema = async () => {
  return saveRealtorContact(realtorJson1)
}

const saveRealtorContactBasedOnSecondSchema = async () => {
  return saveRealtorContact(realtorJson2)
}

const updateRealtorContact = async () => {
  const { leadChannelId } = await setup({ sourceType: 'Realtor' })

  await LeadChannel.save({ source: 'Realtor', ...setLeachChannelIdForRealtor(realtorJson1, leadChannelId) })

  // update
  await LeadChannel.save({ source: 'Realtor', ...setLeachChannelIdForRealtor(realtorJson1, leadChannelId) })

  const [leadChannel, realtorContacts, contacts] = await Promise.all([
    LeadChannel.get(leadChannelId),
    getRealtorContacts(),
    getContacts(),
  ])

  if (leadChannel.capture_number !== 1) {
    throw new Error('capture_number is not updated')
  }

  if (!leadChannel.last_capture_date) {
    throw new Error('last_capture_date is not updated')
  }

  if (contacts?.length !== 1) {
    throw new Error(`expect contacts to be 1 but got ${contacts?.length}`)
  }

  if (realtorContacts?.length !== 1) {
    throw new Error(`expect zillow_contacts to be 1 but got ${realtorContacts?.length}`)
  }

  const targetRealtorContact = realtorContacts[0]
  const targetContact = contacts[0]

  if (targetContact.lead_channel !== leadChannelId) {
    throw new Error(
      `expect contact.lead_channel to be ${leadChannelId} but got ${targetContact.lead_channel}`
    )
  }

  if (targetRealtorContact.contact !== targetContact.id) {
    throw new Error(
      `expect zillow_contact.contact to be ${targetContact.id} but got ${targetRealtorContact.contact}`
    )
  }
}

const invalidSource = () => {
  const run = () => {
    return LeadChannel.save({
      source: 'Invalid',
    })
  }

  expect(run).throws()
}

describe('Lead channel', () => {
  createContext()
  it('Throw an error with invalid lead channel id', invalidLeadChannelId)
  it('Throw an error if lead channel is deleted', deletedLeadChannel)
  it('Throw an error with invalid zillow channel source', invalidLeadChannelSource)
  it('Should create a new contact correctly when the source is Zillow', saveZillowContact)
  it('Should update the contact if email and user and brand is exist when the source is Zillow', updateZillowContact)
  it('Should create a new contact correctly when the source is Realtor with schema type 1', saveRealtorContactBasedOnFirstSchema)
  it('Should create a new contact correctly when the source is Realtor with schema type 2', saveRealtorContactBasedOnSecondSchema)
  it('Should update the contact correctly when the source is Realtor', updateRealtorContact)
  it('Should throw an error when the source is invalid', invalidSource)
})
