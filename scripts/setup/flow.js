/* eslint-disable no-unused-vars */
const BrandFlow = require('../../lib/models/Brand/flow')
const BrandEmail = require('../../lib/models/Brand/email')
const { runInContext } = require('../../lib/models/Context/util')

const Context = require('../../lib/models/Context')

const HOUR = 3600
const DAY = 24 * HOUR

const USER = 'a700ba96-c003-11e7-83d6-0242ac11000d'
const BRAND = '8cb4a358-8973-11e7-9089-0242ac110003'

async function setupFlows() {
  // Context.log('Creating email templates...')

  // const email1 = await BrandEmail.create({
  //   created_by: USER,
  //   brand: BRAND,
  //   body: 'Hey, {{first_name}}! Just wondering if you are interested in ...!',
  //   goal: 'See if people are interested',
  //   include_signature: false,
  //   subject: 'Got a minute?!',
  //   name: 'Cold outbound lead'
  // })
  // Context.log(email1.id)

  // const email2 = await BrandEmail.create({
  //   created_by: USER,
  //   brand: BRAND,
  //   body: 'Hey, {{first_name}}! We offer this service called ...!',
  //   goal: 'Introduce yourself',
  //   include_signature: false,
  //   subject: 'What we offer!',
  //   name: 'Outbound lead #1'
  // })
  // Context.log(email2.id)

  // const email3 = await BrandEmail.create({
  //   created_by: USER,
  //   brand: BRAND,
  //   body: 'Hey, {{first_name}}! Since you showed interest in ...!',
  //   goal: 'Follow up with people who are interested',
  //   include_signature: false,
  //   subject: 'When shall we meet?',
  //   name: 'Outbound lead #2'
  // })
  // Context.log(email3.id)

  Context.log('Creating the flow...')

  await BrandFlow.create(
    BRAND,
    USER,
    require('./flows/new-inbound-lead')
  )

  Context.log('Done!')
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
