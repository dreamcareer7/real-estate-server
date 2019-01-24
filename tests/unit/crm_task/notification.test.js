const moment = require('moment-timezone')

const { createContext, handleJobs } = require('../helper')
const promisify = require('../../../lib/utils/promisify')

const { createBrand } = require('../brand/helper')

const Context = require('../../../lib/models/Context')
const CrmTask = require('../../../lib/models/CRM/Task')
const Worker = require('../../../lib/models/CRM/Task/worker')
const User = require('../../../lib/models/User')

let userA, userB, brand

async function setup() {
  userA = await promisify(User.getByEmail)('test@rechat.com')
  userB = await promisify(User.getByEmail)('test+email@rechat.com')

  brand = await createBrand({
    roles: {
      Admin: [userA.id, userB.id]
    }
  })
  Context.set({ user: userA, brand })
}

async function testAssignment() {
  await CrmTask.create({
    assignees: [userB.id],
    due_date: moment().add(-40, 'seconds').unix(),
    title: 'Test assignment',
    task_type: 'Call',
    status: 'PENDING'
  }, userA.id, brand.id)

  await handleJobs()

  await Worker.sendNotifications()
}

describe('CrmTask', () => {
  createContext()
  beforeEach(setup)

  describe('event notifications', () => {
    context('when user A assigns an event to user B', () => {
      it('should send user B a notification', testAssignment)
    })
  })
})
