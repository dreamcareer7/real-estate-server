// @ts-nocheck

const { createUser, createBrands, runAsUser, getTokenFor, switchBrand } = require('../util')
const { by_mls: listing_by_mls } = require('./listing')

const F = frisby.create.bind(frisby)
const R = () => results.super_campaign

const theTemplate = () => R().instantiateTemplate.data.id
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
    .post('/email/super-campaigns', {})
    .after(cb)
    .expectStatus(200)
}

function getTemplate(cb) {
  return frisby.create('get templates')
    .get(`/brands/${region()}/templates?types[]=JustSold&mediums[]=Email`)
    .after(cb)
    .expectStatus(200)
}

function instantiateTemplate(cb) {
  const id = R().getTemplate.data[0].template.id
  const html = '<div>fakeTemplateInstance</div>'

  const data = {
    html,
    deals: [],
    listings: [
      R().listing_by_mls.data[0].id
    ],
    contacts: []
  }

  return frisby.create('create an instance of a template')
    .post(`/templates/${id}/instances`, data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        html
      }
    })
}

function createdAllowedTag(cb) {
  return frisby.create('create agent tag allowed for use in super campaigns')
    .post('/contacts/tags', {
      tag: 'Labor Day',
      allowedForSuperCampaigns: true
    })
    .after(cb)
    .expectStatus(204)
}

function create(cb) {
  const template_instance = theTemplate()
  const data = {
    subject: 'Happy Labor Day!',
    description: 'A super campaign for Labor Day holiday',
    due_at: Date.now() / 1000,
    template_instance,
    tags: ['Labor Day'],
  }
  return F('create a full super campaign')
    .post('/email/super-campaigns?associations[]=super_campaign.', {
      ...data,
      eligible_brands: [region()],
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        ...data,
        template_instance: undefined,
        type: 'super_campaign'
      }
    })
}

function updateSimpleDetails(cb) {
  const template_instance = theTemplate()
  const data = {
    subject: 'Happy Labor Day!',
    description: 'A super campaign for Labor Day holiday',
    due_at: Date.now() / 1000,
    template_instance,
  }

  return F('update a super campaign')
    .put(`/email/super-campaigns/${R().createEmpty.data.id}`, data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      ...data,
      template_instance: undefined,
    })
}

function updateTags(cb) {
  const id = R().createEmpty.data.id
  return F('update tags')
    .put(`/email/super-campaigns/${id}/tags`, {
      tags: ['Labor Day/Buyers']
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        id,
        tags: ['Labor Day/Buyers']
      }
    })
}

function updateEligibility(cb) {
  const id = R().createEmpty.data.id

  return F('update eligibile brands')
    .put(`/email/super-campaigns/${id}/eligibility?associations[]=super_campaign.eligible_brands`, {
      eligible_brands: [office()]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        id,
        eligible_brands: [office()]
      }
    })
}

function get(cb) {
  const id = R().createEmpty.data.id

  return F('get super campaign')
    .get(`/email/super-campaigns/${id}?associations[]=super_campaign.eligible_brands`)
    .after(cb)
    .expectStatus(200)
    .expectJSON(R().updateEligibility)
}

module.exports = {
  listing_by_mls,

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
    instantiateTemplate,
    createEmpty,
    create,
    updateSimpleDetails,
    updateTags,
    updateEligibility,

    get,
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
