/* eslint-disable no-unused-vars */
const BrandFlow = require('../../lib/models/Brand/flow')
const BrandEmail = require('../../lib/models/Brand/email')
const { runInContext } = require('../../lib/models/Context/util')

const HOUR = 3600
const DAY = 24 * HOUR

const USER = 'a700ba96-c003-11e7-83d6-0242ac11000d'
const BRAND = '8cb4a358-8973-11e7-9089-0242ac110003'

async function setupFlows() {
  const email = await BrandEmail.create({
    created_by: USER,
    brand: BRAND,
    body: 'Hey, {first_name}! Welcome to Rechat!',
    goal: 'Welcoming the new team member',
    include_signature: false,
    subject: 'Welcome!',
    name: 'Rechat Welcome'
  })

  await BrandFlow.create(
    BRAND,
    USER,
    {
      name: 'Rechat Team Onboarding',
      description: 'The process of on-boarding a new team member',
      steps: [
        {
          title: 'Create Rechat email',
          description:
            'Create a Rechat email address for the new guy to use in other services',
          due_in: 16 * HOUR,
          event: {
            title: 'Create Rechat email',
            task_type: 'Other'
          },
          is_automated: false
        },
        {
          title: 'Send a welcome email',
          description: 'Let\'s be friendly!',
          due_in: DAY,
          email: email.id,
          is_automated: true
        },
        {
          title: 'Demo of Rechat',
          description:
            'Dan gives a quick demo of the Rechat system and explains how it works',
          due_in: 3 * DAY + 8 * HOUR,
          event: {
            title: 'Demo of Rechat',
            task_type: 'Call'
          },
          is_automated: false
        }
      ]
    }
  )
}

runInContext('flows', setupFlows).then(
  () => {
    console.log('Flow setup completed!')
    process.exit()
  },
  ex => {
    console.log('Encountered an error while setting up flow configuration!')
    console.error(ex)

    process.exit()
  }
)
