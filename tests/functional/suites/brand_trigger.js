registerSuite('brand', [
  'createParent',
  'attributeDefs',
  'createBrandLists',
  'create',
  'addRole',
  'addMember',
])

registerSuite('template', [
  'create',
  'getForBrand',
  'instantiate',
])

const SUBJECT = 'Another fake email subject'
const WAIT_FOR = -2

const BRAND_TRIGGER_RESP = {
  subject: SUBJECT,
  wait_for: { seconds: WAIT_FOR },
}

const MISSING_BRAND_TRIGGER = 'a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4'
const INVALID_EVENT_TYPE = 'foobarbazqux'
const EVENT_TYPE = 'birthday'

const theBrand = () => results.brand.create.data.id
const theBrandTrigger = () => results.brand_trigger.create.data.id
const theTemplate = () => results.template.getForBrand.data[0].id
const theTemplateInstance = () => results.template.instantiate.data.id

function create (cb) {
  const INIT_SUBJECT = 'Some fake email subject'
  const INIT_WAIT_FOR = -1
  
  return frisby
    .create('create a brand trigger')
    .put(`/brands/${theBrand()}/triggers/${EVENT_TYPE}`, {
      template: theTemplate(),
      subject: INIT_SUBJECT,
      wait_for: INIT_WAIT_FOR,
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        subject: INIT_SUBJECT,
        wait_for: { seconds: INIT_WAIT_FOR },
      },
    })
}

function update (cb) {
  return frisby
    .create('update the created brand trigger')
    .put(`/brands/${theBrand()}/triggers/${EVENT_TYPE}`, {
      template_instance: theTemplateInstance(),
      subject: SUBJECT,
      wait_for: WAIT_FOR,
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({ data: BRAND_TRIGGER_RESP })
}

function getAll (cb) {
  return frisby
    .create('get exiting brand triggers')
    .get(`/brands/${theBrand()}/triggers`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({ data: [BRAND_TRIGGER_RESP] })
}

function disable (cb) {
  return frisby
    .create('disable created brand trigger')
    .patch(`/brands/${theBrand()}/triggers/${theBrandTrigger()}/disable`)
    .after((err, res, json) => {
      if (json.data.deleted_at === null) {
        throw 'deleted_at is not set'
      }

      cb(err, res, json)
    })
    .expectStatus(200)
    .expectJSON({ data: BRAND_TRIGGER_RESP })
}

function getAllAfterDisable (cb) {
  return frisby
    .create('get existing brand triggers (after disable)')
    .get(`/brands/${theBrand()}/triggers`)
    .after((err, res, json) => {
      if (json.data?.[0]?.deleted_at === null) {
        throw 'deleted_at is not set'
      }

      cb(err, res, json)
    })
    .expectStatus(200)
    .expectJSON({ data: [BRAND_TRIGGER_RESP] })
}

function enable (cb) {
  return frisby
    .create('re-enable the created brand trigger')
    .patch(`/brands/${theBrand()}/triggers/${theBrandTrigger()}/enable`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        ...BRAND_TRIGGER_RESP,
        deleted_at: null,
      }
    })
}

function createWithInvalidEventType (cb) {
  return frisby
    .create('create a brand trigger w/ invalid event-type')
    .put(`/brands/${theBrand()}/triggers/${INVALID_EVENT_TYPE}`, {
      template: theTemplate(),
      wait_for: -2,
      subject: SUBJECT,
    })
    .after(cb)
    .expectStatus(400)
    .expectJSON({
      code: 'Validation',
      message: 'Invalid event type',
    })
}

function createWithInvalidData (cb) {
  return frisby
    .create('create a brand trigger w/ invalid data')
    .put(`/brands/${theBrand()}/triggers/${EVENT_TYPE}`, {
      template: theTemplate(),
      template_instance: theTemplateInstance(),
      wait_for: -2,
      subject: SUBJECT,
    })
    .after(cb)
    .expectStatus(400)
    .expectJSON({ code: 'Validation' })
}

function disableNonExisting (cb) {
  return frisby
    .create('disable a non-existing brand trigger')
    .patch(`/brands/${theBrand()}/triggers/${MISSING_BRAND_TRIGGER}/disable`)
    .after(cb)
    .expectStatus(404)
}

function enableNonExisting (cb) {
  return frisby
    .create('enable a non-existing brand trigger')
    .patch(`/brands/${theBrand()}/triggers/${MISSING_BRAND_TRIGGER}/enable`)
    .after(cb)
    .expectStatus(404)
}

function patchWithInvalidAction (cb) {
  return frisby
    .create('patch a brand trigger w/ invalid action')
    .patch(`/brands/${theBrand()}/triggers/${theBrandTrigger()}/foobar`)
    .after(cb)
    .expectStatus(404)
}

module.exports = {
  create,
  update,
  getAll,
  disable,
  getAllAfterDisable,
  enable,
  createWithInvalidEventType,
  createWithInvalidData,
  disableNonExisting,
  enableNonExisting,
  patchWithInvalidAction,
}
