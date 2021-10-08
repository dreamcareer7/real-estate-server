// @ts-nocheck

const { createUser, createBrands, runAsUser, getTokenFor, switchBrand } = require('../util')

const F = frisby.create.bind(frisby)
const R = () => results.super_campaign

const theTemplate = () => R().getTemplate.data[0].id
const region = () => R().brands.data[0].id
const office = () => R().brands.data[0].children[0].id
const team = () => R().brands.data[0].children[0].children[0].id

function dummy(description, cb) {
  return frisby.create(description)
    .get('/_/dummy')
    .after(cb)
}

function createEmpty(cb) {
  return F('create empty super campaign')
    .post('/email/super_campaigns', {})
    .after(cb)
    .expectStatus(200)
}

function getTemplate(cb) {
  return frisby.create('get templates')
    .get(`/brands/${region()}/templates?types[]=JustSold&mediums[]=Email`)
    .after(cb)
    .expectStatus(200)
}

function createdAllowedTag(cb) {
  return frisby.create('create agent tag allowed for use in super campaigns')
    .post(`/contacts/tags`, {
      tag: 'Labor Day',
      allowedForSuperCampaigns: true
    })
    .after(cb)
    .expectStatus(204)
}

function create(cb) {
  const template = theTemplate()
  return F('create a full super campaign')
    .post('/email/super_campaigns', {
      subject: 'Happy Labor Day!',
      description: 'A super campaign for Labor Day holiday',
      due_at: Date.now() / 1000,
      template,
      recipients: [{
        brand: region(),
        tags: ['Labor Day']
      }],
    })
    .after(cb)
    .expectStatus(200)
}

function updateSimpleDetails(cb) {
  const template = theTemplate()
  return F('create a full super campaign')
    .patch(`/email/super_campaigns/${R().createEmpty.data.id}`, {
      subject: 'Happy Labor Day!',
      description: 'A super campaign for Labor Day holiday',
      due_at: Date.now() / 1000,
      template,
    })
    .after(cb)
    .expectStatus(200)
}

function editRecipients(cb) {
  return F('create a full super campaign')
    .patch(`/email/super_campaigns/${R().createEmpty.data.id}`, {
      recipients: [{
        brand: region(),
        tag: 'Labor Day/Buyers'
      }]
    })
    .after(cb)
    .expectStatus(200)
}

module.exports = {
  createAgentUser: createUser({ email: 'agent@rechat.com' }),
  agentAuth: getTokenFor('agent@rechat.com'),
  brands: createBrands('create brands', [{
    name: 'Manhattan',
    brand_type: 'Region',
    roles: {
      Admin: ['test@rechat.com']
    },
    tags: ['Labor Day'],
    templates: [{
      name: 'fake-template-brand-trigger-test',
      variant: 'Template40',
      inputs: ['listing', 'user'],
      template_type: 'JustSold',
      medium: 'Email',
      html: '<div>fakeTemplate</div>',
      mjml: false,
    }],

    contexts: [],
    checklists: [],
    property_types: [],
  
    children: [{
      name: '140 Franklin',
      brand_type: 'Office',
      roles: {
        Admin: ['test@rechat.com']
      },
      contexts: [],
      checklists: [],
      property_types: [],

      children: [{
        name: 'John Doe\'s Team',
        brand_type: 'Team',
        roles: {
          Agent: ['agent@rechat.com']
        },
        contexts: [],
        checklists: [],
        property_types: [],
      }]
    }]
  }], (response) => response.data[0].id),

  ...switchBrand(team, runAsUser('agent@rechat.com', {
    createdAllowedTag,
  })),

  ...switchBrand(region, {
    getTemplate,
    createEmpty,
    create,
    // updateSimpleDetails,
    // editRecipients,
  }),

  // addBrands,
  // removeBrand,

  // enrollAgent,
  // removeAgent,

  ...switchBrand(team, runAsUser('agent@rechat.com', {
    // optIn: dummy,
    optOut: cb => dummy('opt out of a super campaign', cb),
  })),

  // delete: deleteCampaign,
}
