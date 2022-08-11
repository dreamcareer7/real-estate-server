// registerSuite('brand', [
//   'createParent',
//   'create',
//   'addRole',
//   'addMember'
// ])

// registerSuite('user', ['upgradeToAgentWithEmail'])
registerSuite('contact', ['getAttributeDefs', 'create'])

const HOUR = 3600
const DAY = 24 * HOUR

const createDraftEmail = cb => {
  const email = {
    from: results.authorize.token.data.id,
    to: [
      {
        email: 'recipient@rechat.com',
        recipient_type: 'Email'
      },
    ],
    html: '<div>Hi</div>',
    subject: 'Email Subject',
    notifications_enabled: false
  }
  
  return frisby
    .create('Create a draft email campaign')
    .post('/emails', email)
    .after(cb)
    .expectStatus(200)
}

function create(cb) {
  const trigger = {
    user: results.authorize.token.data.id,
    event_type: 'birthday',
    action: 'schedule_email',
    wait_for: -7 * DAY,
    campaign: results.trigger.createDraftEmail.data.id,
    contact: results.contact.create.data[0].id,
  }

  return frisby
    .create('create a user-defined trigger for a contact')
    .post('/triggers?associations[]=trigger.campaign', trigger)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        ...trigger,
        campaign: {
          id: trigger.campaign
        }
      }
    })
}

function update(cb) {
  const toUpdate = {
    user: results.authorize.token.data.id,
    event_type: 'home_anniversary',
    wait_for: -8 * DAY,
    campaign: results.trigger.createDraftEmail.data.id,
  }

  return frisby
    .create('update a user-defined trigger')
    .patch(`/triggers/${results.trigger.create.data.id}`, toUpdate)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        ...results.trigger.create.data,
        ...toUpdate,
        campaign: undefined
      }
    })
}


function filterTriggersByExistingEventType(cb) {
  return frisby
    .create('filter triggers by an existing event_type')
    .get('/triggers/filter?event_types[]=home_anniversary')
    .after(cb)
    .expectStatus(200)
    .expectJSON({ data: [results.trigger.update.data] })
}

function filterTriggersByNotExistingEventType(cb) {
  return frisby
    .create('filter triggers by a not existing event_type')
    .get('/triggers/filter?event_types[]=birthday')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 0)
}

function filterTriggersByExistingAction(cb) {
  return frisby
    .create('filter triggers by an existing action')
    .get('/triggers/filter?actions[]=schedule_email')
    .after(cb)
    .expectStatus(200)
    .expectJSON({ data: [results.trigger.update.data] })
}

function filterTriggersByNotExistingAction(cb) {
  return frisby
    .create('filter triggers by a not existing action')
    .get('/triggers/filter?actions[]=create_event')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 0)
}

function filterTriggersByExistingContact(cb) {
  return frisby
    .create('filter triggers by an existing contact')
    .get(`/triggers/filter?contacts[]=${results.contact.create.data[0].id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({ data: [results.trigger.update.data] })
}

function filterTriggersByNotExistingContact(cb) {
  return frisby
    .create('filter triggers by a not existing contact')
    .get('/triggers/filter?contacts[]=44d9ae26-23fb-45ac-88ce-1cd5b1d10807')
    .after(cb)
    .expectStatus(200)
    .expectJSONLength('data', 0)
}

function checkTriggersOnContact(cb) {
  return frisby
    .create('check all active triggers on a contact')
    .get(`/contacts/${results.contact.create.data[0].id}?associations[]=contact.triggers`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        triggers: [results.trigger.update.data]
      }
    })
}

function deleteTrigger(cb) {
  return frisby
    .create('delete a user-defined trigger')
    .delete(`/triggers/${results.trigger.create.data.id}`)
    .after(cb)
    .expectStatus(204)
}




module.exports = {
  createDraftEmail,
  create,
  update,
  filterTriggersByExistingEventType,
  filterTriggersByNotExistingEventType,
  filterTriggersByExistingAction,
  filterTriggersByNotExistingAction,
  filterTriggersByExistingContact,
  filterTriggersByNotExistingContact,
  checkTriggersOnContact,
  deleteTrigger,
}
