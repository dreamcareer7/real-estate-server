const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')
const promisify = require('../../../lib/utils/promisify')
const sql = require('../../../lib/models/SupportBot/sql')

const Contact = require('../../../lib/models/Contact')
const Context = require('../../../lib/models/Context')
const CrmTask = require('../../../lib/models/CRM/Task')
const User = require('../../../lib/models/User')

const { createBrand } = require('../brand/helper')

let user, brand

async function setup() {
  user = await promisify(User.getByEmail)('test@rechat.com')

  brand = await createBrand({
    roles: {
      Admin: [user.id]
    }
  })
  Context.set({ user, brand })

  const ids = await createContact()
  await createTask(ids.slice(0, 1))
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
    associations: contact_associations.map(a => ({
      association_type: 'contact',
      contact: a
    })),
    due_date: Date.now() / 1000 - 24 * 3600,
    title: 'Called him',
    status: 'DONE',
    task_type: 'Call'
  }, user.id, brand.id)

  await handleJobs()

  return task
}

async function testTouchDates() {
  const summaries = await sql.select('select * from contacts_summaries where last_touch is not null', [])

  expect(summaries).to.have.length(1)

  const { ids } = await Contact.fastFilter(brand.id, [], {
    last_touch_gte: Date.now() / 1000 - 7 * 24 * 3600
  })

  expect(ids).to.have.length(1)
  expect(ids[0]).to.equal(summaries[0].id)
}

async function testSortByLastTouch() {
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
