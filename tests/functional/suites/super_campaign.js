// @ts-nocheck
const path = require('path')
const fs = require('fs')
const get = require('lodash/get')
const omit = require('lodash/omit')

const { AGENT_SMITH1, AGENT_SMITH2, AGENT_SMITH3, DARTH_VADER, NARUTO } = require('./data/super_campaign/emails')
const brandSetup = require('./data/super_campaign/brand')
const mappings = require('./data/super_campaign/csv_mappings')

const DUE_AT = Date.now() / 1000 - 1

const {
  createUser,
  createBrands,
  runAsUser,
  getTokenFor,
  switchBrand,
  userId,
  currentBrand,
  resolve,
} = require('../util')
const { by_mls: listing_by_mls } = require('./listing')

const F = frisby.create.bind(frisby)
const R = () => results.super_campaign
const id = (key) => {
  if (typeof key === 'function') {
    key = key.name
  }
  return get(R(), `${key}.data.id`)
}
const ID = (key) => () => id(key)

const theTemplate = () => R().instantiateTemplate.data.id
const region = () => R().brands.data[0].id
const office = () => R().brands.data[0].children[0].id
const theMatrix = () =>
  R().brands.data[0].children[0].children.find((b) => b.name === 'The Matrix').id
const theDarkSide = () =>
  R().brands.data[0].children[0].children.find((b) => b.name === 'The Dark Side').id
const konoha = () =>
  R().brands.data[0].children[0].children.find((b) => b.name === 'Konohagakur').id

function runFrisbyConditions(f, { some, every, length, total } = {}) {
  resolve(some)?.forEach?.(s => f.expectJSON('data.?', s))

  resolve(every)?.forEach?.(e => f.expectJSON('data.*', e))

  length = resolve(length)
  if (typeof length === 'number') {
    f.expectJSONLength('data', length)
  }

  total = resolve(total)
  if (typeof total === 'number') {
    f.expectJSON({ info: { total } })
  }
}

function setAdminPermissionSetting (
  value,
  name = `Set admin permission setting := ${value}`
) {
  return cb => F(name)
    .put('/users/self/settings/super_campaign_admin_permission', { value })
    .after(cb)
    .expectStatus(200)
}

function uploadCSV(filename) {
  return (cb) => {
    const csv = fs.createReadStream(path.resolve(__dirname, 'data/super_campaign', filename))

    return F('upload a CSV file')
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

    return F('import contacts from CSV file')
      .post('/contacts/import.csv', data)
      .after(cb)
      .expectStatus(200)
  }
}

function dummy(description, cb) {
  return F(description).get('/_/dummy').after(cb)
}

function createEmpty(cb) {
  return F('create empty super campaign')
    .post('/email/super-campaigns', {})
    .after(cb)
    .expectStatus(200)
}

function getTemplate(cb) {
  return F('get templates')
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

  return F('create an instance of a template')
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

function createdAllowedTag(
  tag,
  allowed = false, // Temporary?
) {
  return (cb) => F('create agent tag allowed for use in super campaigns')
    .post('/contacts/tags', {
      tag,
      auto_enroll_in_super_campaigns: allowed,
    })
    .after(cb)
    .expectStatus(204)
}

function create(cb) {
  const template_instance = theTemplate()
  const data = {
    subject: 'Happy Labor Day!',
    description: 'A super campaign for Labor Day holiday',
    due_at: DUE_AT,
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
        ...omit(data, 'template_instance'),
        type: 'super_campaign',
      },
    })
}

function adminEnroll(super_campaign, enrollments) {
  return cb => {
    enrollments = resolve(enrollments)
    return F('manually enroll a user')
      .post(`/email/super-campaigns/${super_campaign()}/enrollments`, { enrollments })
      .after(cb)
      .expectStatus(201)
  }
}

function selfEnroll(super_campaign, { tags }) {
  return cb => {
    return F('self enroll into a super campaign')
      .put(`/email/super-campaigns/${super_campaign()}/enrollments/self`, { tags })
      .after(cb)
      .expectStatus(200)
  }
}

function checkEnrollments(
  super_campaign,
  conds,
  name = 'check enrolled users after create',
) {
  return (cb) => {
    const f = F(name)
      .get(
        `/email/super-campaigns/${super_campaign()}/enrollments?associations[]=super_campaign_enrollment.user&associations[]=super_campaign_enrollment.brand`
      )
      .after(cb)
      .expectStatus(200)

    runFrisbyConditions(f, conds)

    return f
  }
}

function checkSelfEnrollments(conds) {
  return (cb) => {
    const f = F('check super campaigns the user is enrolled in')
      .get('/email/super-campaigns/enrollments/self')
      .after(cb)
      .expectStatus(200)

    runFrisbyConditions(f, conds)

    return f
  }
}

function updateSimpleDetails(id, data) {
  return (cb) => {
    data = resolve(data)
    return F('update a super campaign')
      .put(`/email/super-campaigns/${id()}`, data)
      .after(cb)
      .expectStatus(200)
      .expectJSON({
        data: omit(data, 'template_instance'),
      })
  }
}

// eslint-disable-next-line no-unused-vars
function invalidUpdateSimpleDetails (
  id,
  data,
  name = 'update a super campaign (invalid)',
  status = 400,
) {
  return cb => F(name)
    .put(`/email/super-campaigns/${resolve(id)}`, resolve(data))
    .after(cb)
    .expectStatus(status)
}

function updateTags(id, tags) {
  return (cb) => {
    return F('update tags')
      .put(`/email/super-campaigns/${id()}/tags`, {
        tags,
      })
      .after(cb)
      .expectStatus(200)
      .expectJSON({
        data: {
          id,
          tags,
        },
      })
  }
}

function updateEligibility(id) {
  return (cb) => {
    return F('update eligibile brands')
      .put(
        `/email/super-campaigns/${id()}/eligibility?associations[]=super_campaign.eligible_brands`,
        {
          eligible_brands: [office()],
        }
      )
      .after(cb)
      .expectStatus(200)
      .expectJSON({
        data: {
          id,
          eligible_brands: [office()],
        },
      })
  }
}

function getSuperCampaign ({
  id = ID('christmas.create'),
  name = 'get super campaign',
  eligibleBrands = true,
  status = 200,
  json, 
} = {}) {
  return cb => {
    const url = `/email/super-campaigns/${resolve(id)}`
    const assocs = '?associations[]=super_campaign.eligible_brands'
    
    return F(name)
      .get(url + (eligibleBrands ? assocs : ''))
      .after(cb)
      .expectStatus(status)
      .expectJSON(resolve(json))
  }
}

function execute(id) {
  return (cb) => {
    return F('execute the super campaign')
      .post('/jobs', {
        name: 'execute_super_campaign',
        data: id(),
      })
      .after(cb)
  }
}

function checkResults(super_campaign, conds) {
  return (cb) => {
    const f = F('check super campaign results')
      .get(
        `/email/super-campaigns/${super_campaign()}/enrollments?associations[]=super_campaign_enrollment.campaign`
      )
      .after(cb)
      .expectStatus(200)

    runFrisbyConditions(f, conds)

    return f
  }
}

function checkCampaign(cond) {
  return (cb) => {
    return F('check email campaign created by the super campaign')
      .get(`/brands/${currentBrand()}/emails/campaigns`)
      .after(cb)
      .expectStatus(200)
      .expectJSON('data.?', cond())
  }
}

function filter(conds, message = 'check all existing super campaigns') {
  return (cb) => {
    const f = F(message)
      .post('/email/super-campaigns/filter', {
        start: 0,
        limit: 50,
      })
      .after(cb)
      .expectStatus(200)


    runFrisbyConditions(f, conds)

    return f
  }
}

function getEligibleCampaigns(conds) {
  return cb => {
    const f = F('get my eligible super campaigns')
      .get('/email/super-campaigns/self')
      .after(cb)
      .expectStatus(200)

    runFrisbyConditions(f, conds)

    return f
  }
}

function getEligibleAgents (id, conds, name = 'get eligible agents') {
  return cb => {
    const f = F(name)
      .get(`/email/super-campaigns/${resolve(id)}/eligible/agents`)
      .after(cb)
      .expectStatus(200)

    runFrisbyConditions(f, conds)

    return f
  }
}

function deleteSuperCampaign (
  id,
  name = 'delete the super campaign',
  status = 204
) {
  return cb => F(name)
    .delete(`/email/super-campaigns/${resolve(id)}`)
    .after(cb)
    .expectStatus(status)
}

function toggleNotifications (
  id,
  enable,
  name = `${enable ? 'enable' : 'disable'} notifications`,
  status = 200,
) {
  return cb => F(name)
    .patch(
      `/email/super-campaigns/${resolve(id)}/enrollments/self`,
      { notifications_enabled: enable },
    )
    .after(cb)
    .expectStatus(status)
}

const createdSuperCampaigns = filter({
  some: [
    {
      deleted_at: null,
      subject: 'Happy New Year!',
      tags: ['Christmas'],
    },
    {
      deleted_at: null,
      subject: 'Happy Labor Day!',
      tags: ['Labor Day'],
    },
  ],
  total: 2,
})

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

  brands: createBrands('create brands', brandSetup, (response) => response.data[0].id),

  ...switchBrand(
    theMatrix,
    runAsUser(AGENT_SMITH1, {
      createdAllowedTagForAgentSmith: createdAllowedTag('Labor Day'),
      uploadCsvForAgentSmith: uploadCSV('agent1.csv'),
      importCsvForAgentSmith: importCSV(ID('uploadCsvForAgentSmith'), userId(AGENT_SMITH1)),
      permitAutoEnrollmentForAgentSmith1: setAdminPermissionSetting(true),
    })
  ),
  ...switchBrand(
    theDarkSide,
    runAsUser(DARTH_VADER, {
      createdAllowedTagForDarthVader: createdAllowedTag('Christmas'),
      uploadCsvForDarthVader: uploadCSV('agent2.csv'),
      importCsvForDarthVader: importCSV(ID('uploadCsvForDarthVader'), userId(DARTH_VADER)),
      permitAutoEnrollmentForDarthVader: setAdminPermissionSetting(true),
    })
  ),
  ...switchBrand(
    konoha,
    runAsUser(NARUTO, {
      createdAllowedTagForNaruto: createdAllowedTag('Labor Day'),
      uploadCsvForNaruto: uploadCSV('agent3.csv'),
      importCsvForNaruto: importCSV(ID('uploadCsvForNaruto'), userId(NARUTO)),
      // permitAutoEnrollmentForNaruto: setAdminPermissionSetting(true),
    })
  ),

  ...switchBrand(region, {
    getTemplate,
    instantiateTemplate,
    christmas: {
      create: createEmpty,

      // setDueAtWithoutTemplateInstance: invalidUpdateSimpleDetails(
      //   ID('christmas.create'),
      //   {
      //     subject: 'Invalid',
      //     description: 'Invalid Invalid Invalid',
      //     due_at: () => Date.now() / 1000,
      //     template_instance: null,        
      //   },
      //   'set due_at when template_instance is not set',
      // ),
      
      updateSimpleDetails: updateSimpleDetails(ID('christmas.create'), {
        subject: 'Happy New Year!',
        description: 'A super campaign for the new year!',
        due_at: () => Date.now() / 1000,
        template_instance: theTemplate,
      }),
      updateTags: updateTags(ID('christmas.create'), ['Christmas']),
      updateEligibility: updateEligibility(ID('christmas.create')),

      // TODO: create some agents...
      checkEligibleAgents: getEligibleAgents(ID('christmas.create'), {
        some: [],
        total: 0,
      }),
      
      checkEnrollments: checkEnrollments(ID('christmas.create'), {
        some: [
          {
            user: { email: AGENT_SMITH1 },
            brand: { id: theMatrix },
            tags: ['Christmas'],
          },
          {
            user: { email: DARTH_VADER },
            brand: { id: theDarkSide },
            tags: ['Christmas'],
          },
        ],
        total: 2,
      }),

      enrollNaruto: adminEnroll(ID('christmas.create'), [
        {
          brand: konoha,
          user: userId(NARUTO),
          tags: ['Christmas', 'OnlyForNaruto'],
        },
      ]),

      checkNarutoManuallyEnrolled: checkEnrollments(ID('christmas.create'), {
        some: [
          {
            user: { email: AGENT_SMITH1 },
            brand: { id: theMatrix },
            tags: ['Christmas'],
          },
          {
            user: { email: DARTH_VADER },
            brand: { id: theDarkSide },
            tags: ['Christmas'],
          },
          {
            user: { email: NARUTO },
            brand: { id: konoha },
            tags: ['Christmas', 'OnlyForNaruto'],
          },
        ],
        total: 3,
      }),

      get: getSuperCampaign({
        json () {
          const expected = { ...R().christmas.updateEligibility }
          expected.data = { ...expected.data, enrollments_count: 3 }
          return expected
        }
      }),
    },
    labor_day: {
      create,
      checkEnrollments: checkEnrollments(ID('labor_day.create'), {
        some: [
          {
            user: { email: AGENT_SMITH1 },
            brand: { id: theMatrix },
            tags: ['Labor Day'],
          },
          {
            user: { email: DARTH_VADER },
            brand: { id: theDarkSide },
            tags: ['Labor Day'],
          },
        ],
        total: 2,
      }),

      execute: execute(ID('labor_day.create')),

      checkResults: checkResults(ID('labor_day.create'), {
        some: [
          {
            campaign: {
              subject: () => R().labor_day.create.subject,
              type: 'email_campaign',
            },
            type: 'super_campaign_enrollment',
          },
        ],
      }),
    },
    createdSuperCampaigns,
  }),

  ...switchBrand(
    theMatrix,
    runAsUser(AGENT_SMITH1, {
      checkLaborDayCampaignForAgentSmith: checkCampaign(() => ({
        subject: R().labor_day.create.subject,
        due_at: DUE_AT,
      })),

      getEligibleCampaigns: getEligibleCampaigns({
        every: [
          {
            id: ID('christmas.create'),
          },
        ],
        length: 1,
      }),

      enrollInChristmas: selfEnroll(ID('christmas.create'), {
        tags: ['New Year'],
      }),

      enableNotifications: toggleNotifications(ID('christmas.create'), true),

      getEnrollments: checkSelfEnrollments({
        some: [
          {
            super_campaign: ID('christmas.create'),
            tags: ['New Year'],
          },
        ],
        total: 1,
      }),
    })
  ),

  ...switchBrand(region, {
    updateTagsAfterManualEnroll: updateTags(ID('christmas.create'), ['Christmas', 'New Year']),
    
    checkEnrollmentsAfterUpdatingTags: checkEnrollments(ID('christmas.create'), {
      some: [
        {
          user: { email: AGENT_SMITH1 },
          brand: { id: theMatrix },
          tags: ['Christmas', 'New Year'],
        },
        {
          user: { email: DARTH_VADER },
          brand: { id: theDarkSide },
          tags: ['Christmas', 'New Year'],
        },
        {
          user: { email: NARUTO },
          brand: { id: konoha },
          tags: ['OnlyForNaruto', 'Christmas', 'New Year'],
        },
      ],
      total: 3,
    }),
  }),

  ...switchBrand(
    theMatrix,
    runAsUser(AGENT_SMITH1, {
      checkLaborDayCampaignForNaruto: checkCampaign(() => ({
        subject: R().labor_day.create.subject,
        due_at: DUE_AT,
      })),
    })
  ),

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

  ...switchBrand(konoha, runAsUser(NARUTO, {
    deleteInvalid: deleteSuperCampaign(
      'an-invalid-id',
      'try to delete an invalid ID',
      400,
    ),
    deleteMissing: deleteSuperCampaign(
      'aaaaaaaa-bbbb-4ccc-9ddd-eeeeeeeeeeee',
      'try to delete a missing super campaign',
      404,
    ),
    deleteUnauthorized: deleteSuperCampaign(
      ID('christmas.create'),
      'try to delete a super campaign that belongs to someone else',
      403,
    ),
  })),
  
  ...switchBrand(region, {
    delete: deleteSuperCampaign(ID('christmas.create')),
  })
}
