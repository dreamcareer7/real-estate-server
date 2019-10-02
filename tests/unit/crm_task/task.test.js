const { expect } = require('chai')

const { createContext } = require('../helper')

const BrandHelper = require('../brand/helper')

const Orm = require('../../../lib/models/Orm')
const Context = require('../../../lib/models/Context')
const CrmTask = require('../../../lib/models/CRM/Task')
const CrmAssociation = require('../../../lib/models/CRM/Association')
const Contact = require('../../../lib/models/Contact')
const User = require('../../../lib/models/User')

const { attributes } = require('../contact/helper')

let user, brand

async function setup() {
  user = await User.getByEmail('test@rechat.com')

  brand = await BrandHelper.create({
    roles: {
      Agent: [user.id]
    }
  })

  Context.set({ user: user, brand })
}

async function testUpdateAssociation() {
  Orm.setEnabledAssociations(['crm_task.associations'])

  const [contact] = await Contact.create([{
    user: user.id,
    attributes: attributes({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@doe.com',
    }),
  }], user.id, brand.id)

  const task = await CrmTask.create(
    {
      created_by: user.id,
      brand: brand.id,
      assignees: [user.id],
      due_date: Date.now() / 1000,
      title: 'Test assignment',
      task_type: 'Call',
      status: 'PENDING',
      associations: [{
        association_type: 'contact',
        contact
      }]
    }
  )

  if (!task.associations) throw new Error('Task was created but no associations were returned.')

  await CrmAssociation.update([{ id: task.associations[0], index: 1}])
  const assoc = await CrmAssociation.get(task.associations[0])

  expect(assoc.index).to.be.equal(1)
}

describe('CrmTask', () => {
  createContext()
  beforeEach(setup)

  it('should allow updating association metadata', testUpdateAssociation)
})
