const { expect } = require('chai')

const { createContext } = require('../helper')

const BrandHelper = require('../brand/helper')

const Orm = {
  ...require('../../../lib/models/Orm/context'),
  ...require('../../../lib/models/Orm/index')
}

const Context = require('../../../lib/models/Context')
const CrmTask = require('../../../lib/models/CRM/Task')
const Assignee = require('../../../lib/models/CRM/Task/assignee')
const CrmTaskEmitter = require('../../../lib/models/CRM/Task/emitter')
const CrmAssociation = require('../../../lib/models/CRM/Association')
const Contact = require('../../../lib/models/Contact/manipulate')

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
  
  return CrmTask.createMany([
    {
      ...base_task,
      title: 'all_day true',
      associations: [{
        association_type: 'contact',
        contact
      }],
      reminders: [{
        is_relative: false,
        timestamp: base_task.due_date - 3600
      }],
      all_day: true
    },
    {
      ...base_task,
      title: 'all_day false',
      due_date: Date.now() / 1000 + 86400,
      assignees: [],
      all_day: false
    },
    {
      ...base_task,
      title: 'empty metadata',
      due_date: Date.now() / 1000 + 86400,
      assignees: [],
      metadata: {}
    },
    {
      ...base_task,
      title: 'undefined metadata',
      due_date: Date.now() / 1000 + 86400
    }
  ])
}

async function testCreateMany() {
  const task_ids = await createTwoTasks()
  expect(task_ids).to.have.length(4)

  Orm.setEnabledAssociations(['crm_task.assignees'])
  const tasks = await CrmTask.getAll(task_ids)

  expect(tasks[0].all_day).to.be.equal(true)
  expect(tasks[1].all_day).to.be.equal(false)
  expect(tasks[2].metadata.toString()).to.be.equal({}.toString())
  expect(tasks[3].metadata).to.be.equal(null)
}

function testCreateManyEmitsCreateEvent(done) {
  CrmTaskEmitter.once('create', ({ task_ids, user_id, brand_id }) => {
    expect(task_ids).to.have.length(4)
    expect(user_id).to.be.equal(user.id)
    expect(brand_id).to.be.equal(brand.id)

    done()
  })

  createTwoTasks().catch(done)
}

async function testClone() {
  const [contact] = await createContact()

  const rawTask = await CrmTask.create({
    ...base_task,
    title: 'all_day true',
    associations: [{
      association_type: 'contact',
      contact
    }],
    reminders: [{
      is_relative: false,
      timestamp: base_task.due_date - 3600
    }],
    all_day: true
  })

  const associations = ['crm_task.associations', 'crm_task.reminders', 'crm_task.assignees']
  Orm.setEnabledAssociations(associations)

  const [task] = await Orm.populate({
    models: [rawTask],
    associations,
  })

  const clonedTask = await CrmTask.clone({brand: brand.id, title: 'new_one', created_by: user.id}, task.id)
  expect(clonedTask.title).to.be.equal('new_one')
  expect(clonedTask.task_type).to.be.equal('Call')
  expect(clonedTask.status).to.be.equal('PENDING')

  const [populatedClonedTask] = await Orm.populate({
    models: [clonedTask],
    associations,
  })

  /** @type {ICrmAssociation[]} */ const assocs = populatedClonedTask.associations
  expect(assocs.length).to.be.equal(1)
  expect(assocs[0].association_type).to.be.equal('contact')

  /** @type {IReminder[]} */ const reminders = populatedClonedTask.reminders
  expect(reminders.length).to.be.equal(1)
  expect(reminders[0].timestamp).to.be.equal(base_task.due_date - 3600)
}

async function testAssignees() {
  const task = await CrmTask.create(base_task)
  await BrandHelper.removeMember(brand.id, user.id)

  const assignees = await Assignee.getForTask(task.id)
  expect(assignees).to.be.empty
}

describe('CrmTask', () => {
  createContext()
  beforeEach(setup)

  it('should allow updating association metadata', testUpdateAssociation)
  it('should create multiple tasks', testCreateMany)
  it('should emit create event when creating multiple tasks', testCreateManyEmitsCreateEvent)
  it('should clone a trigger', testClone)
  it('should not include removed users in assignees', testAssignees)
})
