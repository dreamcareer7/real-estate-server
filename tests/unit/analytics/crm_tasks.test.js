const moment = require('moment-timezone')

const { createContext } = require('../helper')

const CrmTask = require('../../../lib/models/CRM/Task')
const { CrmTaskQueryBuilder } = require('../../../lib/models/Analytics/OLAP')
const Context = require('../../../lib/models/Context')
const User = require('../../../lib/models/User')

const BrandHelper = require('../brand/helper')

let user, brand

/** @type {CrmTaskQueryBuilder} */
let Model

async function setup() {
  user = await User.getByEmail('test@rechat.com')

  brand = await BrandHelper.create({
    roles: {
      Admin: [user.id]
    }
  })

  Context.set({ user, brand })

  Model = new CrmTaskQueryBuilder(['created_at.day'], undefined, user.id, brand.id)
}

async function testCrmTaskAgg() {
  await CrmTask.create({
    title: 'Test',
    task_type: 'Call',
    status: 'DONE',
    due_date: moment().unix()
  }, user.id, brand.id)

  await Model.aggregate()
}

describe('Analytics', () => {
  describe('Deals', () => {
    createContext()
    beforeEach(setup)

    it(
      'should include listing offers in contracts report',
      testCrmTaskAgg
    )
  })
})
