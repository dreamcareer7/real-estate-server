const { expect } = require('chai')

const { createContext } = require('../helper')

const BrandHelper = require('../brand/helper')

const Orm = require('../../../lib/models/Orm')
const Context = require('../../../lib/models/Context')
const CrmTask = require('../../../lib/models/CRM/Task')
const CrmAssociation = require('../../../lib/models/CRM/Association')
const Contact = require('../../../lib/models/Contact')

const UserHelper = require('../user/helper')

const { attributes } = require('../contact/helper')

let user, brand

/** @type {RequireProp<ITaskInput, 'brand' | 'created_by'>} */
let base_task

async function setup() {
  user = await UserHelper.TestUser()

  brand = await BrandHelper.create({
    roles: {
      Agent: [user.id]
    }
  })

  base_task = {
    created_by: user.id,
    brand: brand.id,
    assignees: [user.id],
    due_date: Date.now() / 1000,
    title: 'Test assignment',
    task_type: 'Call',
    status: 'PENDING'
  }

  Context.set({ user: user, brand })
}

async function createContact() {
  return Contact.create([{
    user: user.id,
    attributes: attributes({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@doe.com',
    }),
  }], user.id, brand.id)
}

async function testUpdateAssociation() {
  Orm.setEnabledAssociations(['crm_task.associations'])

  const [contact] = await createContact()

  const task = await CrmTask.create(
    {
      ...base_task,
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

async function createTwoTasks() {
  const [contact] = await createContact()
  
  return CrmTask.createMany([{
    ...base_task,
    associations: [{
      association_type: 'contact',
      contact
    }],
    reminders: [{
      is_relative: false,
      timestamp: base_task.due_date - 3600
    }]
  }, {
    ...base_task,
    due_date: Date.now() / 1000 + 86400,
    assignees: []
  }])
}

async function testCreateMany() {
  const task_ids = await createTwoTasks()
  expect(task_ids).to.have.length(2)
}

function testCreateManyEmitsCreateEvent(done) {
  CrmTask.once('create', ({ task_ids, user_id, brand_id }) => {
    expect(task_ids).to.have.length(2)
    expect(user_id).to.be.equal(user.id)
    expect(brand_id).to.be.equal(brand.id)

    done()
  })

  createTwoTasks().catch(done)
}

describe('CrmTask', () => {
  createContext()
  beforeEach(setup)

  it('should allow updating association metadata', testUpdateAssociation)
  it('should create multiple tasks', testCreateMany)
  it('should emit create event when creating multiple tasks', testCreateManyEmitsCreateEvent)
})
