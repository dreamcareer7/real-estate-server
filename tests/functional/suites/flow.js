registerSuite('contact', [
  'brandCreateParent',
  'brandCreate',
  'getAttributeDefs',
  'create'
])

const addEmail = cb => {
  const email = {
    name: 'Email Name',
    goal: 'Email Goal',
    subject: 'Email Subject',
    body: 'Email Body',
    include_signature: true
  }

  return frisby.create('add an email template to a brand')
    .post(`/brands/${results.contact.brandCreateParent.data.id}/emails/templates`, email)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: email
    })
}

const addFlow = cb => {
  const HOUR = 3600
  const DAY = 24 * HOUR
  const flow = {
    name: 'Rechat Team Onboarding',
    description: 'The process of on-boarding a new team member',
    steps: [{
      title: 'Create Rechat email',
      description: 'Create a Rechat email address for the new guy to use in other services',
      due_in: 10 * HOUR,
      is_automated: false,
      event: {
        title: 'Create Rechat email',
        task_type: 'Other',
      }
    }, {
      title: 'Send them a test email',
      description: 'Automatically send them a test email to make sure it\'s working',
      due_in: 8 * HOUR + DAY,
      is_automated: true,
      email: results.flow.addEmail.data.id
    }, {
      title: 'Demo of Rechat',
      description: 'Dan gives a quick demo of the Rechat system and explains how it works',
      due_in: 3 * DAY + 14 * HOUR,
      is_automated: false,
      event: {
        title: 'Demo of Rechat',
        task_type: 'Call',
      }
    }]
  }

  return frisby.create('add a brand flow')
    .post(`/brands/${results.contact.brandCreateParent.data.id}/flows?associations[]=brand_flow.steps&associations[]=brand_flow_step.event&associations[]=brand_flow_step.email`, flow)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        ...flow,
        steps: [
          flow.steps[0],
          {
            ...flow.steps[1],
            email: {
              id: flow.steps[1].email
            }
          },
          flow.steps[2],
        ]
      }
    })
}

const getBrandFlows = cb => {
  return frisby.create('add a brand flow')
    .get(`/brands/${results.contact.brandCreate.data.id}/flows?associations[]=brand_flow.steps&associations[]=brand_flow_step.event&associations[]=brand_flow_step.email`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [{
        name: 'Rechat Team Onboarding',
        description: 'The process of on-boarding a new team member',
        steps: [{}, {}, {}]
      }]
    })
}

const enroll = cb => {
  return frisby.create('enroll a contact to a flow')
    .post('/crm/flows', {
      origin: results.flow.getBrandFlows.data[0].id,
      starts_at: Date.now() / 1000,
      steps: results.flow.getBrandFlows.data[0].steps.map(s => s.id),
      contacts: [results.contact.create.data[0].id]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [{
        steps: [{}, {}, {}]
      }]
    })
}

const checkFlowAssociation = cb => {
  return frisby.create('check flow association on contact')
    .get(`/contacts/${results.contact.create.data[0].id}?associations[]=contact.flows&associations[]=flow_step.crm_task&associations[]=flow_step.email`)
    .after(cb)
    .expectJSON({
      data: {
        flows: [{
          steps: [{}, {}, {}]
        }]
      }
    })
}

const stop = cb => {
  return frisby.create('stop a flow')
    .delete(`/crm/flows/${results.flow.enroll.data[0].id}`)
    .after(cb)
    .expectStatus(204)
}

const checkStoppedFlowAssociation = cb => {
  return frisby.create('check flow association on contact')
    .get(`/contacts/${results.contact.create.data[0].id}?associations[]=contact.flows&associations[]=flow_step.crm_task&associations[]=flow_step.email`)
    .after(cb)
    .expectJSON({
      data: {
        flows: null
      }
    })
}


module.exports = {
  addEmail,
  addFlow,
  getBrandFlows,
  enroll,
  checkFlowAssociation,
  stop,
  checkStoppedFlowAssociation
}
