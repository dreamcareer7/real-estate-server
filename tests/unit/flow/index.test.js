const { expect } = require('chai')

const BrandFlow = require('../../../lib/models/Brand/flow')
const Context = require('../../../lib/models/Context')
const Orm = require('../../../lib/models/Orm')
const User = require('../../../lib/models/User')

const { createContext } = require('../helper')
const BrandHelper = require('../brand/helper')

let user, brand

async function setup() {
  user = await User.getByEmail('test@rechat.com')

  brand = await BrandHelper.create({
    roles: {
      Admin: [user.id]
    },
    flows: [{
      created_by: user.id,
      name: 'Rechat Team Onboarding',
      description: 'The process of on-boarding a new team member',
      steps: [{
        title: 'Create Rechat email',
        description: 'Create a Rechat email address for the new guy to use in other services',
        due_in: 0,
        event: {
          title: 'Create Rechat email',
          task_type: 'Other',
        }
      }, {
        title: 'Demo of Rechat',
        description: 'Dan gives a quick demo of the Rechat system and explains how it works',
        due_in: 3,
        event: {
          title: 'Demo of Rechat',
          task_type: 'Call',
        }
      }]
    }]
  })

  Context.set({ user, brand })
}

async function itShouldWork() {
  const models = await BrandFlow.forBrand(brand.id)

  const populated = await Orm.populate({
    models,
    associations: [
      'brand_flow.steps',
      'brand_flow_step.event'
    ]
  })

  console.log(populated)

  expect(models).to.have.length(1)
  expect(models[0].steps).to.have.length(2)
}

describe('Flow', () => {
  createContext()
  beforeEach(setup)

  it('should work!', itShouldWork)
})
