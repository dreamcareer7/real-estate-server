const { expect, assert } = require('chai')
const moment = require('moment-timezone')
const mjml2html = require('mjml')

const sql = require('../../../lib/utils/sql')
const BrandFlow = {
  ...require('../../../lib/models/Brand/flow/get'),
  ...require('../../../lib/models/Brand/flow/create'),
}
const BrandFlowStep = {
  ...require('../../../lib/models/Brand/flow_step/create'),
  ...require('../../../lib/models/Brand/flow_step/get'),
  ...require('../../../lib/models/Brand/flow_step/manipulate'),
}
const Contact = {
  ...require('../../../lib/models/Contact/manipulate'),
  ...require('../../../lib/models/Contact/get'),
}
const Context = require('../../../lib/models/Context')
const CrmTask = require('../../../lib/models/CRM/Task')
const Calendar = require('../../../lib/models/Calendar')
const Flow = require('../../../lib/models/Flow')
const FlowStep = require('../../../lib/models/Flow/step/get')
const Orm = {
  ...require('../../../lib/models/Orm/index'),
  ...require('../../../lib/models/Orm/context'),
}
const User = require('../../../lib/models/User/get')
const BrandTemplate = require('../../../lib/models/Template/brand/get')
const Template = require('../../../lib/models/Template/get')
const TemplateInstance = require('../../../lib/models/Template/instance/index')
const Trigger = {
  ...require('../../../lib/models/Trigger/get'),
  ...require('../../../lib/models/Trigger/due'),
  ...require('../../../lib/models/Trigger/filter'),
  ...require('../../../lib/models/Trigger/execute'),
}
const EmailCampaign = require('../../../lib/models/Email/campaign/get')

const { createContext, handleJobs } = require('../helper')
const templates = require('../brand/templates')
const BrandHelper = require('../brand/helper')
const { attributes } = require('../contact/helper')
const db = require('../../../lib/utils/db')

let user, brand, brand_flow

const HOUR = 3600
const DAY = 24 * HOUR

const BIRTHDAY = moment.utc().add(2, 'days').startOf('day').add(-20, 'years')

const CONTACT = {
  first_name: 'Abbas',
  email: 'abbas@rechat.com',
  tag: ['Tag1', 'Tag2'],
}

/**
 * @param {string} userId 
 * @returns {any[]}
 */
const defaultFlowSteps = (userId) => [{
  created_by: userId,
  name: 'Rechat Team Onboarding',
  description: 'The process of on-boarding a new team member',
  steps: [{
    title: 'Create Rechat email',
    description: 'Create a Rechat email address for the new guy to use in other services',
    wait_for: {days: 1},
    time: '08:00:00',
    order: 1,
    is_automated: false,
    event_type: 'last_step_date',
    event: {
      title: 'Create Rechat email',
      task_type: 'Other',
    }
  }, {
    title: 'Send them a test email',
    description: 'Automatically send them a test email to make sure it\'s working',
    wait_for: {weeks: 1},
    time: '08:00:00',
    order: 2,
    is_automated: true,
    event_type: 'last_step_date',
    email: {
      name: 'Onboarding Email',
      goal: 'Test email for new team members',
      subject: 'Test email from Rechat',
      include_signature: false,
      body: 'Hey, this is a test!',
    }
  }, {
    title: 'Demo of Rechat',
    description: 'Dan gives a quick demo of the Rechat system and explains how it works',
    wait_for: {days: 5},
    time: '10:00:00',
    order: 3,
    is_automated: false,
    event_type: 'last_step_date',
    event: {
      title: 'Demo of Rechat',
      task_type: 'Call',
    }
  }, {
    title: 'After a long time',
    description: '23 months is passed',
    wait_for: {months: 23},
    time: '10:00:00',
    order: 4,
    is_automated: false,
    event_type: 'last_step_date',
    event: {
      title: 'After a long time',
      task_type: 'Call',
    }
  }]
}]

async function setup() {
  user = await User.getByEmail('test@rechat.com')

  if (!user) {
    assert.fail('failed to make user')
  }

  brand = await BrandHelper.create({
    templates,
    roles: {
      Admin: [user.id]
    },
    flows: defaultFlowSteps(user.id)
  })

  Context.set({ user, brand })

  brand_flow = await loadFlow()
}

async function loadFlow() {
  const models = await BrandFlow.forBrand(brand.id)
  expect(models).to.have.length(1)

  const populated = await Orm.populate({
    models,
    associations: [
      'brand_flow.steps',
      'brand_flow_step.event'
    ]
  })

  return populated[0]
}

async function testBrandFlows() {
  const { steps } = brand_flow
  const [{ steps: defaultSteps }] = defaultFlowSteps(user.id)
  expect(steps).to.have.length(4)
  for (const i in steps) {
    if (steps[i].wait_for.hours) {
      expect(steps[i].wait_for.hours).to.be.equal(defaultSteps[i].wait_for.hours)
      expect(steps[i].wait_for_unit).to.be.equal('hours')
    }
    if (steps[i].wait_for.days) {
      expect(steps[i].wait_for.days).to.be.equal(defaultSteps[i].wait_for.days)
      expect(steps[i].wait_for_unit).to.be.equal('days')
    }
    if (steps[i].wait_for.weeks) {
      expect(steps[i].wait_for.weeks).to.be.equal(defaultSteps[i].wait_for.weeks)
      expect(steps[i].wait_for_unit).to.be.equal('weeks')
    }
    if (steps[i].wait_for.months) {
      expect(steps[i].wait_for.months).to.be.equal(defaultSteps[i].wait_for.months)
      expect(steps[i].wait_for_unit).to.be.equal('months')
    }
    if (steps[i].wait_for.years) {
      expect(steps[i].wait_for.years).to.be.equal(defaultSteps[i].wait_for.years)
      expect(steps[i].wait_for_unit).to.be.equal('years')
    }
  }
}

/**
 * @param {Object} attrs
 * @param {string=} [attrs.first_name]
 * @param {string=} [attrs.email]
 * @param {number=} [attrs.birthday]
 * @param {number=} [attrs.wedding_anniversary]
 * @param {number=} [attrs.home_anniversary]
 * @param {string[]=} [attrs.tag]
 */
async function createContact(attrs = CONTACT) {
  const ids = await Contact.create(
    [
      {
        user: user.id,
        attributes: attributes(attrs)
      }
    ],
    user.id,
    brand.id,
    'direct_request',
    { activity: false, get: false, relax: false }
  )

  await handleJobs()

  return ids[0]
}

async function testEnrollContact() {
  const id = await createContact()

  const [flow] = await Flow.enrollContacts(brand.id, user.id, brand_flow.id, Date.now() / 1000, brand_flow.steps.map(s => s.id), [id])

  return { flow, contact: id }
}

async function createTemplateInstance({ mjml = false }) {
  const brandTemplates = await BrandTemplate.getForBrands({ brands: [brand.id] })

  const tpls = await Template.getAll(brandTemplates.map(bt => bt.template))
  const template = tpls.find(t => t.mjml === mjml)
  if (!template) {
    throw new Error('Couldn\'t find a suitable template!')
  }

  const template_input = templates.find(t => t.name === template.name && t.variant === template.variant)
  const html = template_input?.html

  const instance = await TemplateInstance.create({
    template,
    html,
    deals: [],
    contacts: [],
    listings: [],
    created_by: user
  })

  return instance
}

async function setupFlowWithEmailAndTemplateInstanceStep({ mjml } = { mjml: false }) {
  const instance = await createTemplateInstance({ mjml })

  const brandFlowId = await BrandFlow.create(brand.id, user.id, {
    created_by: user.id,
    name: 'TemplateInstance step',
    description: 'A flow with an template instance email step',
    steps: [{
      title: 'Happy birthday email',
      description: 'Send a customized happy birthday email',
      wait_for: { days: 1 },
      time: '08:00:00',
      order: 1,
      is_automated: false,
      event_type: 'last_step_date',
      template_instance: instance.id
    }]
  })

  const brandFlowStepIds = await sql.selectIds('SELECT id FROM brands_flow_steps WHERE flow = $1', [ brandFlowId ])
  return {
    instance,
    brandFlowId,
    brandFlowStepIds
  }
}

async function testFlowWithEmailAndTemplateInstanceStep() {
  const { brandFlowId, brandFlowStepIds } = await setupFlowWithEmailAndTemplateInstanceStep()
  const contact = await createContact()
  const [flow] = await Flow.enrollContacts(brand.id, user.id, brandFlowId, Date.now() / 1000, brandFlowStepIds, [contact])

  const triggers = await sql.select('SELECT id FROM triggers WHERE flow = $1 and contact = $2', [ flow.id, contact ])
  expect(triggers).to.have.length(1)

  await Trigger.executeDue()
  await handleJobs()

  const campaigns = await sql.selectIds('SELECT id FROM email_campaigns WHERE brand = $1', [brand.id]).then(EmailCampaign.getAll)
  expect(campaigns).to.have.length(1)
  expect(campaigns[0].html).to.be.equal('<div>Happy Birthday To You!</div>')
  expect(campaigns[0].text).to.be.equal('Happy Birthday To You!')
}

async function testFlowWithEmailAndMjmlTemplateInstanceStep() {
  const { instance, brandFlowId, brandFlowStepIds } = await setupFlowWithEmailAndTemplateInstanceStep({ mjml: true })
  const contact = await createContact()
  const [flow] = await Flow.enrollContacts(brand.id, user.id, brandFlowId, Date.now() / 1000, brandFlowStepIds, [contact])

  const triggers = await sql.select('SELECT id FROM triggers WHERE flow = $1 and contact = $2', [ flow.id, contact ])
  expect(triggers).to.have.length(1)

  await Trigger.executeDue()
  await handleJobs()

  const campaigns = await sql.selectIds('SELECT id FROM email_campaigns WHERE brand = $1', [brand.id]).then(EmailCampaign.getAll)
  expect(campaigns).to.have.length(1)
  expect(campaigns[0].html).to.be.equal(mjml2html(instance.html, { minify: true }).html)
  expect(campaigns[0].text).to.be.equal('Hello World')
}

async function testFlowProgress() {
  const { flow, contact: contact_id } = await testEnrollContact()

  await Trigger.executeDue()
  await handleJobs()

  const tasks = await CrmTask.getForUser(user.id, brand.id, {})

  expect(tasks, 'A crm task should\'ve been created as the result of the first step').to.have.length(1)

  const due_date = tasks[0].due_date
  expect(due_date).to.be.equal(
    moment.tz(user.timezone)
      .startOf('day')
      .add(1, 'days')
      .add(8, 'hours')
      .unix()
  )

  const campaigns = await sql.select('SELECT id FROM email_campaigns WHERE brand = $1', [brand.id])
  expect(campaigns).to.have.length(1)

  Orm.setEnabledAssociations(['contact.triggers'])
  const contact = await Contact.get(contact_id)
  expect(contact.triggers).to.have.length(1)

  const { steps } = await Flow.get(flow.id)
  expect(steps, 'Two steps should be present after the first one was executed').to.have.length(2)

  const flow_steps = await FlowStep.getAll(steps)
  expect(flow_steps[0].crm_task).to.be.equal(tasks[0].id)
  expect(flow_steps[0].executed_at).not.to.be.null
  expect(flow_steps[1].executed_at).to.be.null
  expect(flow_steps[1].crm_task).to.be.null
  expect(flow_steps[1].campaign).to.be.null

  const trigger = await Trigger.get(contact.triggers[0])
  expect(trigger.flow_step).to.be.equal(steps[0])
}

async function testFlowProgressFail() {
  const attrs = { ...CONTACT }
  delete attrs.email

  const id = await createContact(attrs)
  const [flow] = await Flow.enrollContacts(brand.id, user.id, brand_flow.id, Date.now() / 1000, brand_flow.steps.map(s => s.id), [id])
  
  await Trigger.executeDue()
  await handleJobs()

  const { steps } = await Flow.get(flow.id)
  expect(steps, 'Three steps should be present after the second one failed to be scheduled').to.have.length(3)

  const flow_steps = await FlowStep.getAll(steps)

  expect(flow_steps[1].failed_at).to.be.a('number')
}

async function testStepOrderCollisionOnUpdate() {
  await BrandFlowStep.update(user.id, brand_flow.steps[2].id, {
    ...brand_flow.steps[2],
    order: 1
  })

  const updated_flow = await loadFlow()
  expect(updated_flow.steps[0].id).to.be.equal(brand_flow.steps[2].id)
  expect(updated_flow.steps[1].id).to.be.equal(brand_flow.steps[0].id)
  expect(updated_flow.steps[2].id).to.be.equal(brand_flow.steps[1].id)
}

async function testStepOrderNoCollisionOnUpdate() {
  await BrandFlowStep.update(user.id, brand_flow.steps[2].id, {
    ...brand_flow.steps[2],
    order: 0
  })

  const updated_flow = await loadFlow()
  expect(updated_flow.steps[0].id).to.be.equal(brand_flow.steps[2].id)
  expect(updated_flow.steps[0].order).to.be.equal(0)  // was 3
  expect(updated_flow.steps[1].id).to.be.equal(brand_flow.steps[0].id)
  expect(updated_flow.steps[1].order).to.be.equal(1)  // remained 1
  expect(updated_flow.steps[2].id).to.be.equal(brand_flow.steps[1].id)
  expect(updated_flow.steps[2].order).to.be.equal(2)  // remained 2
}

async function testStepOrderNoCollisionOnCreate() {
  const new_step = await BrandFlowStep.create(user.id, brand.id, {
    flow: brand_flow.id,
    title: 'Another demo',
    description: 'This time by Reza',
    wait_for: { days: 1},
    time: '04:00:00',
    order: 4,
    is_automated: false,
    event_type: 'last_step_date',
    event: {
      title: 'Demo with Reza',
      task_type: 'Call',
    }
  })

  const updated_flow = await loadFlow()
  expect(updated_flow.steps[0].id).to.be.equal(brand_flow.steps[0].id)
  expect(updated_flow.steps[0].order).to.be.equal(1)  // remained 1
  expect(updated_flow.steps[1].id).to.be.equal(brand_flow.steps[1].id)
  expect(updated_flow.steps[1].order).to.be.equal(2)  // remained 2
  expect(updated_flow.steps[2].id).to.be.equal(brand_flow.steps[2].id)
  expect(updated_flow.steps[2].order).to.be.equal(3)  // remained 3
  expect(updated_flow.steps[3].id).to.be.equal(new_step)
  expect(updated_flow.steps[3].order).to.be.equal(4)  // remained 4
}

async function testStepOrderCollisionOnCreate() {
  const new_step = await BrandFlowStep.create(user.id, brand.id, {
    flow: brand_flow.id,
    title: 'Add to Gitlab',
    description: 'Give them access to Gitlab',
    wait_for: { days: 1},
    time: '08:00:00',
    order: 3,
    is_automated: false,
    event_type: 'last_step_date',
    event: {
      title: 'Add to Gitlab',
      task_type: 'Other',
    }
  })

  const updated_flow = await loadFlow()
  expect(updated_flow.steps[0].id).to.be.equal(brand_flow.steps[0].id)
  expect(updated_flow.steps[0].order).to.be.equal(1)  // remained 1
  expect(updated_flow.steps[1].id).to.be.equal(brand_flow.steps[1].id)
  expect(updated_flow.steps[1].order).to.be.equal(2)  // remained 2
  expect(updated_flow.steps[2].id).to.be.equal(new_step)
  expect(updated_flow.steps[2].order).to.be.equal(3)  // placed on position 3
  expect(updated_flow.steps[3].id).to.be.equal(brand_flow.steps[2].id)
  expect(updated_flow.steps[3].order).to.be.equal(4)  // was 3
}

async function testDuplicateEnroll() {
  const id = await createContact()

  const lastWeek = moment.utc().add(-1, 'week').unix() / 1000
  await Flow.enrollContacts(brand.id, user.id, brand_flow.id, lastWeek, brand_flow.steps.map(s => s.id), [id])

  const res = await Flow.enrollContacts(brand.id, user.id, brand_flow.id, Date.now() / 1000, brand_flow.steps.map(s => s.id), [id])

  expect(res).to.be.empty


}

async function testStopFlowByDeleteContact() {
  const id = await createContact()
  const [flow] = await Flow.enrollContacts(brand.id, user.id, brand_flow.id, Date.now() / 1000, brand_flow.steps.map(s => s.id), [id])
  await handleJobs()

  await Contact.delete([id], user.id)
  await handleJobs()

  const deleted = await Flow.get(flow.id)
  expect(deleted.deleted_at).not.to.be.null
}

async function testStopFlowWithManyExecutedTriggers() {
  const contactId = await createContact({
    first_name: 'Mammad',
    email: 'test@yahoo.com',
    birthday: BIRTHDAY.unix(),
    wedding_anniversary: BIRTHDAY.unix(),
    home_anniversary: BIRTHDAY.unix(),
    tag: ['Tag3', 'Tag4'],
  })
  const instance = await createTemplateInstance({ mjml: true })
  const brandFlowId = await BrandFlow.create(brand.id, user.id, {
    created_by: user.id,
    name: 'TemplateInstance step',
    description: 'A flow with an template instance email step',
    steps: [{
      title: 'Happy birthday email',
      description: 'Send a customized happy birthday email',
      wait_for: { days: 0 },
      time: '08:00:00',
      order: 1,
      is_automated: true,
      event_type: 'birthday',
      template_instance: instance.id,
    }, {
      title: 'Happy wedding_anniversary email',
      description: 'Send a customized happy wedding_anniversary email',
      wait_for: { days: 0 },
      time: '08:00:00',
      order: 2,
      is_automated: true,
      event_type: 'wedding_anniversary',
      template_instance: instance.id,
    }, {
      title: 'Happy home_anniversary email',
      description: 'Send a customized happy home_anniversary email',
      wait_for: { days: 0 },
      time: '08:00:00',
      order: 3,
      is_automated: true,
      event_type: 'home_anniversary',
      template_instance: instance.id,
    }]
  })
  await handleJobs()
  const brandFlow = await BrandFlow.get(brandFlowId)
  const [flow] = await Flow.enrollContacts(
    brand.id,
    user.id,
    brandFlowId,
    moment.tz(user.timezone).startOf('day').valueOf() / 1000,
    brandFlow.steps,
    [contactId],
  )
  const triggerIds = await Trigger.filter({ flow: flow.id })
  // only the first step's trigger is made now
  expect(triggerIds.length).to.be.equal(1)
  const firstTrigger = await Trigger.get(triggerIds[0])
  // execute it and mark the related campaign as executed
  await Trigger.execute(triggerIds[0])
  await db.query.promise('email/campaign/mark-as-executed', [firstTrigger.campaign])
  // execute the other two triggers 
  for (let i = 0; i < 2; i++) {
    const [newTriggerId] = await Trigger.filter({ flow: flow.id, executed_at: null })
    await Trigger.execute(newTriggerId)
    triggerIds.push(newTriggerId)
  }
  // every trigger should be executed by now
  const newTriggerIds = await Trigger.filter({ flow: flow.id, executed_at: null })
  expect(newTriggerIds.length).to.be.not.ok
  // stop the flow, it shall delete all the triggers
  await Flow.stop(user.id, flow.id)
  const triggers = await Trigger.getAll(triggerIds)
  for (const t of triggers) {
    expect(t.deleted_at).to.be.ok
  }
  await handleJobs()
  // every campign should be deleted, except the one we marked as executed
  const campaignIds = triggers.map((t) => t.campaign)
  const campaigns = await EmailCampaign.getAll(campaignIds)
  expect(campaigns[0].deleted_at).to.be.not.ok
  expect(campaigns[1].deleted_at).to.be.ok
  expect(campaigns[2].deleted_at).to.be.ok  
}

async function testStopFlow() {
  const { flow } = await testEnrollContact()

  await Flow.stop(user.id, flow.id)

  const events = await Calendar.filter(null, {
    high: Date.now() / 1000 + 100 * DAY,
    low: Date.now() / 1000 - 100 * DAY,
    object_types: ['crm_task', 'email_campaign']
  })

  expect(events).to.be.empty
}

async function testLastStepDateWithoutFirstStepExecuted() {
  const id = await createContact()
  const starts_at = Date.now() / 1000

  const [flow] = await Flow.enrollContacts(brand.id, user.id, brand_flow.id, starts_at, [brand_flow.steps[2].id], [id])

  await Trigger.executeDue()
  await handleJobs()

  const expectedLastStepDate = moment.unix(starts_at).tz(user.timezone).startOf('day').utc(true).unix()
  const { last_step_date } = await sql.selectOne('SELECT extract(epoch FROM last_step_date) AS last_step_date FROM flows WHERE id = $1', [ flow.id ])
  expect(last_step_date).to.be.equal(expectedLastStepDate)
}

async function testLastStepDateWithFirstStepExecuted() {
  const contact = await createContact()
  const starts_at = Date.now() / 1000

  const [flow] = await Flow.enrollContacts(brand.id, user.id, brand_flow.id, starts_at, brand_flow.steps.map(s => s.id), [contact])

  const [triggerId] = await Trigger.filter({ contact, deleted_at: null })
  const trigger = await Trigger.getDue(triggerId)
  if (!trigger?.timestamp) {
    assert.fail('no timestamp in trigger due')
  }
  await Trigger.executeDue()
  await handleJobs()

  const executed = await sql.select('SELECT * FROM triggers WHERE flow = $1 and contact = $2 AND executed_at IS NOT NULL', [ flow.id, contact ])
  expect(executed).to.have.length(1)
  const expectedLastStepDate = moment.unix(trigger.timestamp).startOf('day').utc(true).unix()
  const { last_step_date } = await sql.selectOne('SELECT extract(epoch FROM last_step_date) AS last_step_date FROM flows WHERE id = $1', [ flow.id ])
  expect(last_step_date).to.be.equal(expectedLastStepDate)
}

async function testEnrollManyWithoutEmail () {
  const contactId1 = await createContact()
  const contactId2 = await createContact({
    first_name: 'Mohamad',
    tag: ['Tag2', 'Tag3'],
  })

  const res = await Flow.enrollContacts(
    brand.id, user.id, brand_flow.id, Date.now() / 1000,
    brand_flow.steps.map(s => s.id), [contactId1, contactId2]
  )

  await handleJobs()

  expect(res).to.be.an('array').that.is.not.empty
}

async function testEnrollOneWithoutEmail () {
  const contactId = await createContact({
    first_name: 'Mammad',
    tag: ['Tag3', 'Tag4'],
  })

  const {
    brandFlowId,
    brandFlowStepIds
  } = await setupFlowWithEmailAndTemplateInstanceStep()

  const res = await Flow.enrollContacts(
    brand.id, user.id, brandFlowId, Date.now() / 1000,
    brandFlowStepIds, [contactId],
  )

  await handleJobs()

  expect(res).to.be.an('array')
}

async function testFlowTriggerEffectiveAtDate() {
  const contactId = await createContact({
    first_name: 'Mammad',
    tag: ['Tag3', 'Tag4'],
  })
  const brandFlowId = await BrandFlow.create(brand.id, user.id, {
    created_by: user.id,
    name: 'FLOW',
    description: 'A flow',
    steps: [{
      title: 'Happy birthday email',
      description: 'Send a customized happy birthday email',
      wait_for: { days: 0 },
      time: '00:00:01',
      is_automated: false,
      event_type: 'last_step_date',
      order: 1,
      event: {
        title: 'Create Rechat email',
        task_type: 'Other',
      },
    }],
  })
  const brandFlows = await BrandFlow.forBrand(brand.id)
  const [flow] = await Flow.enrollContacts(
    brand.id,
    user.id,
    brandFlowId,
    moment.tz(user.timezone).startOf('day').valueOf() / 1000,
    brandFlows[0].steps,
    [contactId],
  )
  const [triggerId] = await Trigger.filter({ flow: flow.id })
  const trigger = await Trigger.get(triggerId)
  expect(trigger.effective_at).to.be.eql(flow.starts_at)
}

async function testDoubleFlowTriggersWithLastStepDateEventType(){
  const contact = await createContact()
  const starts_at = Date.now() / 1000

  await Flow.enrollContacts(brand.id, user.id, brand_flow.id, starts_at, brand_flow.steps.map(s => s.id), [contact])
  const secondBrandFlowId = await BrandFlow.create(brand.id, user.id, {
    created_by: user.id,
    name: 'new',
    description: 'Another brand flow step',
    steps: [{
      title: 'another one',
      description: 'another description',
      wait_for: {days: 1},
      time: '09:00:00',
      order: 1,
      is_automated: false,
      event_type: 'last_step_date',
      event: {
        title: 'Create Rechat email',
        task_type: 'Other',
      }
    }]
  })
  await handleJobs()
  const secondBrandFlow = await BrandFlow.get(secondBrandFlowId)
  await Flow.enrollContacts(
    brand.id,
    user.id,
    secondBrandFlowId,
    starts_at,
    secondBrandFlow.steps,
    [contact],
  )
  await handleJobs()
  const triggerIds = await Trigger.filter({
    contact,
    flow: true,
    brand: brand.id,
    deleted_at: null,
  })
  expect(triggerIds.length).to.be.equal(2)
}

async function testDoubleFlowTriggersWithRegularEventType(){
  const contact = await createContact()
  const starts_at = Date.now() / 1000

  const firstBrandFlowId = await BrandFlow.create(brand.id, user.id, {
    created_by: user.id,
    name: 'new',
    description: 'Another brand flow step',
    steps: [{
      title: 'a title',
      description: 'a description',
      wait_for: {days: 1},
      time: '09:00:00',
      order: 1,
      is_automated: false,
      event_type: 'birthday',
      event: {
        title: 'Create Rechat email',
        task_type: 'Other',
      }
    }]
  })
  const firstBrandFlow = await BrandFlow.get(firstBrandFlowId)
  await Flow.enrollContacts(
    brand.id,
    user.id,
    firstBrandFlowId,
    starts_at,
    firstBrandFlow.steps,
    [contact],
  )
  const [theTriggerId] = await Trigger.filter({
    contact,
    flow: true,
    brand: brand.id,
    deleted_at: null,
  })
  const secondBrandFlowId = await BrandFlow.create(brand.id, user.id, {
    created_by: user.id,
    name: 'new',
    description: 'Another brand flow step',
    steps: [{
      title: 'another one',
      description: 'another description',
      wait_for: {days: 1},
      time: '09:00:00',
      order: 1,
      is_automated: false,
      event_type: 'birthday',
      event: {
        title: 'Create Rechat email',
        task_type: 'Other',
      }
    }]
  })
  await handleJobs()
  const secondBrandFlow = await BrandFlow.get(secondBrandFlowId)
  await Flow.enrollContacts(
    brand.id,
    user.id,
    secondBrandFlowId,
    starts_at,
    secondBrandFlow.steps,
    [contact],
  )
  await handleJobs()
  const triggerIds = await Trigger.filter({
    contact,
    flow: true,
    brand: brand.id,
    deleted_at: null,
  })
  expect(triggerIds.length).to.be.equal(1)
  expect(triggerIds[0]).to.be.equal(theTriggerId)
}

describe('Flow', () => {
  createContext()
  beforeEach(setup)

  describe('enroll', function() {
    it('should enroll a contact to a flow', testEnrollContact)
    it('should prevent duplicate enrollment', testDuplicateEnroll)
    it('successfully enrolls the contacts, when some of them have no email', testEnrollManyWithoutEmail)
    it('successfully enrolls a contact, when it has no email', testEnrollOneWithoutEmail)
    it(
      `
        successfully enrolls a contact into two flows, having steps with event_type=last_step_date,
        creating two different triggers
      `,
      testDoubleFlowTriggersWithLastStepDateEventType,
    )
    it(
      `
        successfully enrolls a contact into two flows, having steps with event_types!=last_step_date,
        the second flow step will not schedule.
      `,
      testDoubleFlowTriggersWithRegularEventType,
    )
  })
  describe('progression', function() {
    it('should progress to next step', testFlowProgress)
    it('should mark next step as failed in case of failure', testFlowProgressFail)
  })
  describe('execution', function() {
    it('should setup brand flow with template instance step', testFlowWithEmailAndTemplateInstanceStep)
  })
  describe('execution', function() {
    it('should setup brand flow with a mjml template instance step', testFlowWithEmailAndMjmlTemplateInstanceStep)
  })
  describe('stop', function() {
    it('should stop a flow instance and delete all future events', testStopFlow)
    it('should stop a flow instance if contact deleted', testStopFlowByDeleteContact)
    it('should delete all triggers related to the flow', testStopFlowWithManyExecutedTriggers)
  })
  describe('last_step_date', function() {
    it('should be same as flow created_at if first step is more than 3 days away', testLastStepDateWithoutFirstStepExecuted)
    it('should be same as flow created_at if first step is less than 3 days away', testLastStepDateWithFirstStepExecuted)
  })
})

describe('Brand Flow', () => {
  createContext()
  beforeEach(setup)

  it('should setup brand flows correctly', testBrandFlows)
  it('should not touch step orders when no collision on create', testStepOrderNoCollisionOnCreate)
  it('should resolve order collision on create', testStepOrderCollisionOnCreate)
  it('should not touch step orders when no collision on update', testStepOrderNoCollisionOnUpdate)
  it('should resolve order collision on update', testStepOrderCollisionOnUpdate)
  it('trigger.effective_at should be the same as flow.starts_at', testFlowTriggerEffectiveAtDate)
})
