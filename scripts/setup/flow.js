/* eslint-disable no-unused-vars */
const BrandFlow = require('../../lib/models/Brand/flow')
const HOUR = 3600
const DAY = 24 * HOUR

async function setupFlows() {
  await BrandFlow.create(
    '8cb4a358-8973-11e7-9089-0242ac110003',
    'a700ba96-c003-11e7-83d6-0242ac11000d',
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
