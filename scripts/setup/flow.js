/* eslint-disable no-unused-vars */
const BrandFlow = require('../../lib/models/Brand/flow')
const BrandEmail = require('../../lib/models/Brand/email')
const { runInContext } = require('../../lib/models/Context/util')

const HOUR = 3600
const DAY = 24 * HOUR

const USER = 'a700ba96-c003-11e7-83d6-0242ac11000d'
const BRAND = '7d0c5bd0-c7f2-11e8-9c5d-0a95998482ac'

async function setupFlows() {
  const email1 = await BrandEmail.create({
    created_by: USER,
    brand: BRAND,
    body: 'Hey, {{first_name}}! Just wondering if you are interested in ...!',
    goal: 'See if people are interested',
    include_signature: false,
    subject: 'Got a minute?!',
    name: 'Cold outbound lead'
  })
  const email2 = await BrandEmail.create({
    created_by: USER,
    brand: BRAND,
    body: 'Hey, {{first_name}}! We offer this service called ...!',
    goal: 'Introduce yourself',
    include_signature: false,
    subject: 'What we offer!',
    name: 'Outbound lead #1'
  })
  const email3 = await BrandEmail.create({
    created_by: USER,
    brand: BRAND,
    body: 'Hey, {{first_name}}! Since you showed interest in ...!',
    goal: 'Follow up with people who are interested',
    include_signature: false,
    subject: 'When shall we meet?',
    name: 'Outbound lead #2'
  })

  await BrandFlow.create(
    BRAND,
    USER,
    {
      name: 'New Outbound Leads',
      description: 'Nurture outbound leads to close more business',
      steps: [
        {
          title: 'Email (Cold outbound lead)',
          description:
            'Send message using Leads - Cold outbound lead - First email template',
          due_in: 0 * DAY + 8 * HOUR,
          email: email1.id,
          is_automated: true
        },
        {
          title: 'Make phone call #1',
          description: 'Make phone call #1',
          due_in: DAY + 8 * HOUR,
          event: {
            title: 'Make phone call #1',
            task_type: 'Call'
          },
          is_automated: false
        },
        {
          title: 'Email (Leads template)',
          description:
            'Send message using Leads - Second email template',
          due_in: 2 * DAY + 8 * HOUR,
          email: email2.id,
          is_automated: true
        },
        {
          title: 'Make phone call #2',
          description: 'Make phone call #2',
          due_in: 3 * DAY + 8 * HOUR,
          event: {
            title: 'Make phone call #2',
            task_type: 'Call'
          },
          is_automated: false
        },
        {
          title: 'Email (Leads template)',
          description:
            'Send message using Leads - Third email template',
          due_in: 5 * DAY + 8 * HOUR,
          email: email3.id,
          is_automated: true
        },
        {
          title: 'Make phone call #3',
          description: 'Make phone call #3/Move to revelant list',
          due_in: 8 * DAY + 8 * HOUR,
          event: {
            title: 'Make phone call #3/Move to revelant list',
            task_type: 'Call'
          },
          is_automated: false
        },
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
