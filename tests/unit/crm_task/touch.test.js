const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')

const AttributeDef = require('../../../lib/models/Contact/attribute_def')
const Contact = require('../../../lib/models/Contact')
const List = require('../../../lib/models/Contact/list')
const Context = require('../../../lib/models/Context')
const CrmTask = require('../../../lib/models/CRM/Task')
const User = require('../../../lib/models/User')

const BrandHelper = require('../brand/helper')

/** @type {IUser} */
let user

/** @type {IBrand} */
let brand

/** @type {UUID[]} */
let contact_ids

const WARM_LIST_TOUCH_FREQ = 30

async function setup() {
  user = await User.getByEmail('test@rechat.com')

  brand = await BrandHelper.create({
    roles: {
      Admin: [user.id]
    }
  })

  Context.set({ user, brand })

  await createList()

  contact_ids = await createContact()
}

async function createContact() {
  const ids = await Contact.create(
    [
      {
        user: user.id,
        attributes: [
          {
            attribute_type: 'first_name',
            text: 'Abbas'
          },
          {
            attribute_type: 'email',
            text: 'abbas@rechat.com'
          },
          {
            attribute_type: 'tag',
            text: 'Warm List'
          }
        ]
      },
      {
        user: user.id,
        attributes: [
          {
            attribute_type: 'first_name',
            text: 'Emil'
          },
          {
            attribute_type: 'email',
            text: 'emil@rechat.com'
          }
        ]
      }
    ],
    user.id,
    brand.id,
    { activity: false, get: false, relax: false }
  )

  await handleJobs()

  return ids
}

async function createTask(contact_associations) {
  const task = await CrmTask.create({
    created_by: user.id,
    brand: brand.id,
    associations: contact_associations.map(a => ({
      association_type: 'contact',
      contact: a
    })),
    due_date: Date.now() / 1000 - 24 * 3600,
    title: 'Called him',
    status: 'DONE',
    task_type: 'Call'
  })

  await handleJobs()

  return task
}

async function createList() {
  const defs = await AttributeDef.getDefsByName(brand.id)

  const id = List.create(user.id, brand.id, {
    name: 'Warm List',
    touch_freq: WARM_LIST_TOUCH_FREQ,
    filters: [{
      attribute_def: /** @type {UUID} */ (defs.get('tag')),
      value: 'Warm List'
    }]
  })

  await handleJobs()

  return id
}

async function testTouchDates() {
  const task = await createTask(contact_ids.slice(0, 1))

  /** @type {RequireProp<IContact, 'last_touch' | 'next_touch'>} */
  const c = await Contact.get(contact_ids[0])

  expect(c.last_touch).to.be.equal(task.due_date)
  expect(c.next_touch - c.last_touch).to.be.equal(WARM_LIST_TOUCH_FREQ * 24 * 3600)

  const { ids } = await Contact.fastFilter(brand.id, [], {
    last_touch_gte: Date.now() / 1000 - 7 * 24 * 3600
  })

  expect(ids).to.have.length(1)
  expect(ids[0]).to.equal(c.id)
}

async function testSortByLastTouch() {
  await createTask(contact_ids.slice(0, 1))

  const { ids } = await Contact.fastFilter(brand.id, [], {
    order: '-last_touch'
  })

  const contacts = await Contact.getAll([...ids], user.id)

  expect(contacts).to.have.length(2)
  expect(contacts[0].last_touch).not.to.be.null
  expect(contacts[1].last_touch).to.be.null
}

describe('Touch', () => {
  createContext()
  beforeEach(setup)

  it('should update touch dates after a contact is attached to a crm_task', testTouchDates)
  it('should sort correctly by touch dates putting nulls last in descending order', testSortByLastTouch)
})
