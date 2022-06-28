const { createContext } = require('../helper')
const zillowJson = require('./data/zillow.json')
const sql = require('../../../lib/utils/sql')

const UserHelper = require('../user/helper')
const BrandHelper = require('../brand/helper')
// const Context = require('../../../lib/models/Context')

const Zillow = {
  ...require('../../../lib/models/Contact/lead/channel/Zillow/save'),
}

const LeadChannel = {
  ...require('../../../lib/models/Contact/lead/channel/create'),
  ...require('../../../lib/models/Contact/lead/channel/get'),
  ...require('../../../lib/models/Contact/lead/channel/delete'),
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

const saveZillowContact = async () => {
  const { leadChannelId } = await setup({})
  zillowJson.Message.ContactMessage.ContactInfo.PartnerAgentIdentifier = leadChannelId

  await Zillow.save(JSON.stringify(zillowJson))

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
  zillowJson.Message.ContactMessage.ContactInfo.PartnerAgentIdentifier = leadChannelId

  // create a new contact
  await Zillow.save(JSON.stringify(zillowJson))

  // update the contact if email and user and brand is exist
  await Zillow.save(JSON.stringify(zillowJson))

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
    zillowJson.Message.ContactMessage.ContactInfo.PartnerAgentIdentifier = leadChannelId

    // create a new contact
    await Zillow.save(JSON.stringify(zillowJson))
  } catch (error) {
    err = error
  }

  if (!err) {
    throw new Error('Expect throw an error if Lead channel is deleted')

  }
}

const invalidJSON = async () => {
  let err

  try {
    await Zillow.save('invalidjson')
  } catch (error) {
    err = error
  }
  if (!err) {
    throw new Error('Expect throw an error with invalid json')
  }
}

const invalidLeadChannelId = async () => {
  let err
  try {
    await setup({})
    await Zillow.save(JSON.stringify(zillowJson))
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
    zillowJson.Message.ContactMessage.ContactInfo.PartnerAgentIdentifier = leadChannelId
    await Zillow.save(JSON.stringify(zillowJson))
  } catch (error) {
    err = error
  }

  if (!err) {
    throw new Error('Expect throw an error with invalid channel source')
  }
}

describe('Zillow', () => {
  createContext()
  it('Throw an error with invalid JSON', invalidJSON)
  it('Throw an error with invalid lead channel id', invalidLeadChannelId)
  it('Throw an error if lead channel is deleted', deletedLeadChannel)
  it('Throw an error with invalid zillow channel source', invalidLeadChannelSource)
  it('Should create a new contact correctly', saveZillowContact)
  it('Should update the contact if email and user and brand is exist', updateZillowContact)
})

