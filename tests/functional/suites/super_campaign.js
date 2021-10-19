// @ts-nocheck
const path = require('path')
const fs = require('fs')
const mappings = require('./data/super_campaign/csv_mappings')

const { createUser, createBrands, runAsUser, getTokenFor, switchBrand, userId } = require('../util')
const { by_mls: listing_by_mls } = require('./listing')

const F = frisby.create.bind(frisby)
const R = () => results.super_campaign
const ID = (key) => () => R()[key].data.id

const theTemplate = () => R().instantiateTemplate.data.id
const region = () => R().brands.data[0].id
const office = () => R().brands.data[0].children[0].id
const theMatrix = () =>
  R().brands.data[0].children[0].children.find((b) => b.name === 'The Matrix').id
const theDarkSide = () =>
  R().brands.data[0].children[0].children.find((b) => b.name === 'The Dark Side').id
const konoha = () =>
  R().brands.data[0].children[0].children.find((b) => b.name === 'Konohagakur').id

const AGENT_SMITH1 = 'smith@thematrix.me',
  AGENT_SMITH2 = 'smith2@thematrix.me',
  AGENT_SMITH3 = 'smith3@thematrix.me'
const DARTH_VADER = 'darthvader@deathstar.com'
const NARUTO = 'naruto@konoha.org'

function uploadCSV(filename) {
  return (cb) => {
    const csv = fs.createReadStream(path.resolve(__dirname, 'data/super_campaign', filename))

    return frisby
      .create('upload a CSV file')
      .post(
        '/contacts/upload',
        {
          file: csv,
        },
        {
          json: false,
          form: true,
        }
      )
      .addHeader('content-type', 'multipart/form-data')
      .after((err, res, body) => {
        cb(err, { ...res, body: JSON.parse(body) }, body)
      })
      .expectStatus(200)
      .expectJSON({
        code: 'OK',
      })
  }
}

function importCSV(file_id, owner) {
  return (cb) => {
    const data = {
      file_id: file_id(),
      owner: owner(),
      mappings,
    }

    return frisby
      .create('import contacts from CSV file')
      .post('/contacts/import.csv', data)
      .after(cb)
      .expectStatus(200)
  }
}

function dummy(description, cb) {
  return frisby.create(description).get('/_/dummy').after(cb)
}

function createEmpty(cb) {
  return F('create empty super campaign')
    .post('/email/super-campaigns', {})
    .after(cb)
    .expectStatus(200)
}

function getTemplate(cb) {
  return frisby
    .create('get templates')
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
    listings: [R().listing_by_mls.data[0].id],
    contacts: [],
  }

  return frisby
    .create('create an instance of a template')
    .post(`/templates/${id}/instances`, data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        html,
      },
    })
}

function createdAllowedTag(cb) {
  return frisby
    .create('create agent tag allowed for use in super campaigns')
    .post('/contacts/tags', {
      tag: 'Labor Day',
      allowedForSuperCampaigns: true,
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
    .post('/email/super-campaigns', {
      ...data,
      eligible_brands: [region()],
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        ...data,
        template_instance: undefined,
        type: 'super_campaign',
      },
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
      data: {
        ...data,
        template_instance: undefined,
      },
    })
}

function updateTags(cb) {
  const id = R().createEmpty.data.id
  return F('update tags')
    .put(`/email/super-campaigns/${id}/tags`, {
      tags: ['Labor Day/Buyers'],
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        id,
        tags: ['Labor Day/Buyers'],
      },
    })
}

function updateEligibility(cb) {
  const id = R().createEmpty.data.id

  return F('update eligibile brands')
    .put(`/email/super-campaigns/${id}/eligibility?associations[]=super_campaign.eligible_brands`, {
      eligible_brands: [office()],
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: {
        id,
        eligible_brands: [office()],
      },
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

  agentSmith: createUser({ email: AGENT_SMITH1 }),
  agentSmith2: createUser({ email: AGENT_SMITH2 }),
  agentSmith3: createUser({ email: AGENT_SMITH3 }),
  darthvader: createUser({ email: DARTH_VADER }),
  naruto: createUser({ email: NARUTO }),

  agentSmithAuth: getTokenFor(AGENT_SMITH1),
  darthvaderAuth: getTokenFor(DARTH_VADER),
  narutoAuth: getTokenFor(NARUTO),

  brands: createBrands(
    'create brands',
    [
      {
        name: 'Manhattan',
        brand_type: 'Region',
        roles: {
          Admin: ['test@rechat.com'],
        },
        tags: ['Labor Day', 'Christmas'],
        templates: [
          {
            name: 'fake-template-brand-trigger-test',
            variant: 'Template40',
            inputs: ['listing', 'user'],
            template_type: 'JustSold',
            medium: 'Email',
            html: '<div>fakeTemplate</div>',
            mjml: false,
          },
        ],

        contexts: [],
        checklists: [],
        property_types: [],

        children: [
          {
            name: '140 Franklin',
            brand_type: 'Office',
            roles: {
              Admin: ['test@rechat.com'],
            },
            contexts: [],
            checklists: [],
            property_types: [],

            children: [
              {
                name: 'The Matrix',
                brand_type: 'Team',
                roles: {
                  Agent: [AGENT_SMITH1, AGENT_SMITH2, AGENT_SMITH3],
                },
                contexts: [],
                checklists: [],
                property_types: [],
              },
              {
                name: 'The Dark Side',
                brand_type: 'Personal',
                roles: {
                  Agent: [DARTH_VADER],
                },
                contexts: [],
                checklists: [],
                property_types: [],
              },
              {
                name: 'Konohagakur',
                brand_type: 'Team',
                roles: {
                  Agent: [NARUTO],
                },
                contexts: [],
                checklists: [],
                property_types: [],
              },
            ],
          },
        ],
      },
    ],
    (response) => response.data[0].id
  ),

  ...switchBrand(
    theMatrix,
    runAsUser(AGENT_SMITH1, {
      createdAllowedTagForAgentSmith: createdAllowedTag,
      uploadCsvForAgentSmith: uploadCSV('agent1.csv'),
      importCsvForAgentSmith: importCSV(ID('uploadCsvForAgentSmith'), userId(AGENT_SMITH1)),
    })
  ),
  ...switchBrand(
    theDarkSide,
    runAsUser(DARTH_VADER, {
      // createdAllowedTagForDarthVader: createdAllowedTag,
      uploadCsvForDarthVader: uploadCSV('agent2.csv'),
      importCsvForDarthVader: importCSV(ID('uploadCsvForDarthVader'), userId(DARTH_VADER)),
    })
  ),
  ...switchBrand(
    konoha,
    runAsUser(NARUTO, {
      createdAllowedTagForNaruto: createdAllowedTag,
      uploadCsvForNaruto: uploadCSV('agent3.csv'),
      importCsvForNaruto: importCSV(ID('uploadCsvForNaruto'), userId(NARUTO)),
    })
  ),

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

  ...switchBrand(
    theDarkSide,
    runAsUser(DARTH_VADER, {
      optIn: (cb) => dummy('opt into a super campaign', cb),
      optOut: (cb) => dummy('opt out of a super campaign', cb),
    })
  ),

  // delete: deleteCampaign,
}
