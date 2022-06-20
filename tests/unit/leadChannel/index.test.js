const { createContext } = require('../helper')
const UserHelper = require('../user/helper')
const BrandHelper = require('../brand/helper')
const Context = require('../../../lib/models/Context')

const LeadChannel = {
  ...require('../../../lib/models/LeadChannel/create'),
  ...require('../../../lib/models/LeadChannel/get'),
  ...require('../../../lib/models/LeadChannel/delete'),
  ...require('../../../lib/models/LeadChannel/update'),
}

async function setup() {
  const user = await UserHelper.TestUser()

  const brand = await BrandHelper.create({
    roles: {
      Admin: [user.id],
    },
    checklists: [],
    contexts: [],
  })

  const brand2 = await BrandHelper.create({
    roles: {
      Admin: [user.id],
    },
    checklists: [],
    contexts: [],
  })

  Context.set({
    user: user.id,
    brand: brand.id,
    brand2: brand2.id
  })
}

const invalidArgumentSave = async () => {
  try {
    // @ts-ignore
    await LeadChannel.create()
    throw new Error('Should throw error if argument is not provided')
  } catch (error) {}
}

const create = async () => {
  const user = Context.get('user')
  const brand = Context.get('brand')
  const id = await LeadChannel.create(
    {
      sourceType: 'Zillow',
    },
    user,
    brand
  )
  const channel = await LeadChannel.get(id)
  if (channel.user !== user || channel.brand !== brand || channel.source_type !== 'Zillow') {
    throw new Error('channel is saved with invalid data')
  }
  return channel
}

const update = async () => {
  const user = Context.get('user')
  const brand2 = Context.get('brand2')
  const channel = await create()
  await LeadChannel.update(channel.id, user, brand2)
  const updatedChannel = await LeadChannel.get(channel.id)
  
  if (updatedChannel.brand !== brand2) {
    throw new Error('channel is updated with invalid brand')
  } 
  
  if (updatedChannel.updated_at?.toString() === channel.created_at?.toString()) {
    throw new Error('channel is updated with invalid updated_at')
  } 
  
  if (updatedChannel.capture_number !== 0) {
    throw new Error('channel is updated with invalid capture_number')
  } 
  
  if (updatedChannel.last_capture_date) {
    throw new Error('channel is updated with invalid last_capture_date')
  } 
}

const deleteById = async () => {
  const channel = await create()
  const user = Context.get('user')
  await LeadChannel.deleteById(channel.id, user)
  const deletedChannel = await LeadChannel.get(channel.id)
  
  if (!deletedChannel.deleted_at) {
    throw new Error('expect channel has deleted_at but not')
  } 
}

describe('LeadChannel', () => {
  createContext()
  beforeEach(setup)

  it('Should throw error if create argument is not provided', invalidArgumentSave)
  it('Should create a lead channel', create)
  it('Should update a lead channel', update)
  it('Should delete a lead channel', deleteById)
})
