const am = require('../utils/async_middleware.js')
const { expect } = require('../utils/validator')

const isNil = require('lodash/isNil')
const map = require('lodash/map')
const has = require('lodash/has')
const pick = require('lodash/pick')

const Orm = require('../models/Orm/context')
const { strict: assert } = require('assert')

const SuperCampaign = {
  ...require('../models/Email/super_campaign/get'),
  ...require('../models/Email/super_campaign/update'),
  ...require('../models/Email/super_campaign/create'),
  ...require('../models/Email/super_campaign/filter'),
  ...require('../models/Email/super_campaign/delete'),
  ...require('../models/Email/super_campaign/eligibility'),
}

const Enrollment = {
  ...require('../models/Email/super_campaign/enrollment/get'),
  ...require('../models/Email/super_campaign/enrollment/upsert'),
  ...require('../models/Email/super_campaign/enrollment/delete'),
}

const Brand = {
  ...require('../models/Brand/access'),
  ...require('../models/Brand/get'),
  ...require('../models/Brand'),
}

/**
 * @template TParams
 * @template TQuery
 * @template TBody
 * @typedef {import('../../types/monkey/controller').IAuthenticatedRequest<TParams, TQuery, TBody>} IAuthenticatedRequest
 */

/**
 * @typedef {import('../models/Email/super_campaign/types').SuperCampaignApiInput} SuperCampaignApiInput
 * @typedef {import('../models/Email/super_campaign/types').SuperCampaignStored} SuperCampaignStored
 * @typedef {import('../models/Email/super_campaign/types').Filter} SuperCampaignFilter
 * @typedef {IAuthenticatedRequest<{}, {}, SuperCampaignFilter>} FilterRequest
 * @typedef {import('express-serve-static-core').NextFunction} NextFunction
 * @typedef {import('../../types/monkey/controller').IResponse} IResponse
 */

/** @returns {IBrand['id']} */
function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand?.id) throw Error.BadRequest('Brand is not specified.')

  return brand.id
}

/**
 * @param {IAuthenticatedRequest<unknown, unknown, unknown>} req
 * @param {IResponse} _
 * @param {NextFunction} next
 */
function brandAccess(req, _, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  Brand.limitAccess({ user, brand }).then(() => next(), next)
}

/**
 * @param {IBrand['id']} parentId
 * @param {IBrand['id'][]} brandIds
 * @param {string=} [msg]
 */
async function ensureChildrenOf (parentId, brandIds, msg) {
  for (const bid of [...new Set(brandIds)]) {
    if (bid === parentId) { continue }

    expect(bid).to.be.uuid
    
    const parentIds = await Brand.getParents(bid)
    if (parentIds.includes(parentId)) { continue }
    
    throw Error.Forbidden(msg ?? `Current brand is not parent of brand ${bid}`)
  }
}

/**
 * @param {string[] | undefined | null} tags
 * @param {boolean=} [allowEmpty=true]
 */
function validateTags (tags, allowEmpty = true) {
  expect(tags, 'tags must be an array').to.be.an('array')

  if (!allowEmpty) {
    expect(tags, 'tags cannot be empty').not.to.be.empty
  }

  for (const t of tags ?? []) {
    expect(t?.trim?.(), 'tag must be a non-empty string')
      .to.be.a('string').that.is.not.empty 
  }
}

/** @param {any} value */
function validateBoolean (value) {
  expect(value).to.be.a('boolean', 'Boolean value expected')
}

/**
 * @param {SuperCampaignStored['id']} id
 * @param {object} [opts]
 * @param {boolean=} [opts.ofCurrentBrand]
 * @param {boolean=} [opts.maybeExecuted]
 */
async function findAndValidate (id, {
  ofCurrentBrand = true,
  maybeExecuted = false,
} = {}) {
  expect(id).to.be.uuid
  const superCampaign = await SuperCampaign.get(id)

  if (ofCurrentBrand && superCampaign.brand !== getCurrentBrand()) {
    throw Error.Forbidden('Access Denied')
  }

  if (!maybeExecuted && !isNil(superCampaign.executed_at)) {
    throw Error.Forbidden(`Super Campaign ${id} already executed`)
  }
  
  return superCampaign
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, {}>} req 
 * @param {IResponse} res 
 */
async function get(req, res) {
  const superCampaign = await findAndValidate(
    req.params.id,
    { maybeExecuted: true },
  )
  
  res.model(superCampaign)
}

/**
 * @param {IAuthenticatedRequest<{}, {}, SuperCampaignApiInput>} req 
 * @param {IResponse} res 
 */
async function create(req, res) {
  const id = await SuperCampaign.create(req.body, req.user.id, getCurrentBrand())
  const created = await SuperCampaign.get(id)

  res.model(created)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, SuperCampaignApiInput>} req 
 * @param {IResponse} res 
 */
async function update(req, res) {
  const superCampaign = await findAndValidate(req.params.id)
  
  await SuperCampaign.update(superCampaign.id, req.body)
  const updated = await SuperCampaign.get(superCampaign.id)

  res.model(updated)
}

/**
 * @param {IAuthenticatedRequest<{ id: SuperCampaignStored['id'] }, {}, {}>} req
 * @param {IResponse} res
 */
async function deleteSuperCampaign (req, res) {
  const superCampaign = await findAndValidate(req.params.id)

  const deleted = await SuperCampaign.delete([superCampaign.id])
  assert.equal(deleted, 1, 'Impossible state')

  res.status(204).end()
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, { tags: string[] }>} req 
 * @param {IResponse} res 
 */
async function updateTags(req, res) {
  const { tags } = req.body
  
  const superCampaign = await findAndValidate(req.params.id)

  await SuperCampaign.updateTags(superCampaign.id, tags)
  const updated = await SuperCampaign.get(superCampaign.id)

  res.model(updated)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, { eligible_brands: UUID[] }>} req 
 * @param {IResponse} res 
 */
async function updateBrands(req, res) {
  const eligibleBrands = req.body.eligible_brands
  expect(eligibleBrands).to.be.an('array')
  
  const superCampaign = await findAndValidate(req.params.id)
  
  await SuperCampaign.updateBrands(superCampaign.id, eligibleBrands)
  const updated = await SuperCampaign.get(superCampaign.id)

  res.model(updated)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, PaginationOptions, {}>} req 
 * @param {IResponse} res 
 */
async function getEnrollments(req, res) {
  const superCampaign = await findAndValidate(
    req.params.id,
    { maybeExecuted: true },
  )
  
  const enrollments = await Enrollment.filter({
    ...req.query,
    super_campaign: superCampaign.id,
    including_deleted: true,
    order: ['-updated_at', '-created_at', '-deleted_at'],
  })

  res.collection(enrollments)
}

/**
 * @param {IAuthenticatedRequest<{}, {}, SuperCampaignFilter>} req
 * @param {IResponse} res 
 */
async function filter(req, res) {
  const filterOpts = SuperCampaign.sanitizeFilterOptions(req.body)
  
  const superCampaigns = await SuperCampaign.filter({
    ...filterOpts,
    brand_in: [getCurrentBrand()],
  })

  res.collection(superCampaigns)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, PaginationOptions, {}>} req 
 * @param {IResponse} res 
 */
async function getResults(req, res) {
  expect(req.params.id).to.be.uuid
  throw Error.NotImplemented('Not implemented yet')
}

/**
 * @typedef {Object} EnrollRequestItem
 * @property {IBrand['id']} brand
 * @property {IUser['id']} user
 * @property {string[]} tags
 *
 * @typedef {Object} EnrollRequestBody
 * @property {EnrollRequestItem[]} enrollments
 *
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, EnrollRequestBody>} req 
 * @param {IResponse} res 
 */
async function enroll(req, res) {
  const { enrollments: data } = req.body
  const admin = req.user

  expect(data, 'You need to specify the array of new enrollments in the field `enrollments`').to.be.an('array').that.is.not.empty
  await ensureChildrenOf(getCurrentBrand(), map(data, 'brand'))
  
  const superCampaign = await findAndValidate(req.params.id)
  
  const inputs = data.map(({ brand, user, tags }) => {
    expect(brand).to.be.uuid
    expect(user).to.be.uuid
    validateTags(tags)
    // TODO: ensure that `user` belongs to the `brand`

    return { brand, user, tags, super_campaign: superCampaign.id, created_by: admin.id }
  })

  const ids = await Enrollment.upsertMany(inputs)
  const enrollments = await Enrollment.getAll(ids)

  res.status(201).collection(enrollments)
}

/**
 * @typedef {Object} EnrollMeRequestBody
 * @property {string[] | undefined} tags
 *
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, EnrollMeRequestBody>} req 
 * @param {IResponse} res 
 */
async function enrollMe(req, res) {
  const superCampaign = await findAndValidate(
    req.params.id,
    { ofCurrentBrand: false },
  )
  await ensureChildrenOf(superCampaign.brand, [getCurrentBrand()])

  const tags = req.body.tags || superCampaign.tags
  validateTags(tags)
  
  const [enrollmentId] = await Enrollment.upsertMany([{
    super_campaign: superCampaign.id,
    brand: getCurrentBrand(),
    user: req.user.id,
    tags: /** @type {string[]} */(tags),
    created_by: req.user.id,
  }])
  const enrollment = await Enrollment.get(enrollmentId)

  res.model(enrollment)
}

/**
 * @typedef {Object} PatchMyEnrollmentRequestBody
 * @property {string[] | undefined} tags
 * @property {boolean | undefined} notifications_enabled
 *
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, PatchMyEnrollmentRequestBody>} req 
 * @param {IResponse} res 
 */
async function patchMyEnrollment (req, res) {
  await findAndValidate(req.params.id, { ofCurrentBrand: false })

  const NE = 'notifications_enabled'

  const data = pick(req.body, 'tags', NE)
  expect(data, 'Nothing provided to get patched').not.to.be.empty

  if (has(data, 'tags')) { validateTags(data.tags) }
  if (has(data, NE)) { validateBoolean(data[NE]) }
  
  const identity = {
    brand: getCurrentBrand(),
    super_campaign: req.params.id,
    user: req.user.id,
  }
  
  const succeed = await Enrollment.patch({ ...identity, ...data })
  expect(succeed, 'No such super campaign enrollment').to.be.true

  const [enrollment] = await Enrollment.filter({ ...identity, limit: 1 })
  expect(enrollment, 'Impossible state').to.be.ok

  res.model(enrollment)  
}

/**
 * @typedef {Object} UnenrollRequestBody
 * @property {string} user
 * @property {string} brand
 *
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, UnenrollRequestBody>} req 
 * @param {IResponse} res 
 */
async function unenroll(req, res) {
  const superCampaignId = req.params.id
  const { brand: brandId, user: userId } = req.body

  expect(superCampaignId).to.be.uuid
  expect(userId).to.be.uuid
  expect(brandId).to.be.uuid
  // TODO: ensure that `user` belongs to the `brand`
  await ensureChildrenOf(getCurrentBrand(), [brandId])

  await Enrollment.deleteBy({ brandId, userId, superCampaignId })

  res.status(204).end()
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, {}>} req 
 * @param {IResponse} res 
 */
async function unenrollMe(req, res) {
  expect(req.params.id).to.be.uuid
  
  await Enrollment.deleteBy({
    brandId: getCurrentBrand(),
    userId: req.user.id,
    superCampaignId: req.params.id,
  })
  
  res.status(204).end()
}

/**
 * @param {IAuthenticatedRequest<{}, {}, {}>} _
 * @param {IResponse} res 
 */
async function myEligibleSuperCampaigns(_, res) {
  const brandId = getCurrentBrand()
  const allBrandIds = [...await Brand.getParents(brandId), brandId]
  const superCampaigns = await SuperCampaign.filter({
    brand_in: allBrandIds,
    executed: false,
    draft: false,
    order: ['+due_at', '-updated_at', '-created_at'],
  })

  res.collection(superCampaigns)
}

/**
 * @param {IAuthenticatedRequest<{}, {}, {}>} req
 * @param {IResponse} res 
 */
async function myEnrollments (req, res) {
  const enrollments = await Enrollment.filter({
    brand: getCurrentBrand(),
    user: req.user.id,
    executed: false,
    order: ['-updated_at', '-created_at', '-deleted_at'],
  })

  res.collection(enrollments)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, {}>} req
 * @param {IResponse} res 
 */
async function getEligibleAgents (req, res) {
  const superCampaign = await findAndValidate(
    req.params.id,
    { maybeExecuted: true },
  )
  
  const eligBrandIds = await SuperCampaign.getEligibleBrands(superCampaign.id)
  if (!eligBrandIds.length) { return res.collection([]) }

  const agents = await SuperCampaign.getEligibleAgents(eligBrandIds)
  if (!agents.length) { return res.collection([]) }

  Orm.setAssociationConditions({ 'brand_role.members': map(agents, 'user') })

  const brandIds = [...new Set(map(agents, 'brand'))]
  const brands = await Brand.getAll(brandIds)

  res.collection(brands)
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/email/super-campaigns/self', brandAccess, am(myEligibleSuperCampaigns))
  app.get('/email/super-campaigns/enrollments/self', brandAccess, am(myEnrollments))
  app.put('/email/super-campaigns/:id/enrollments/self', auth, brandAccess, am(enrollMe)) // For agent
  app.patch('/email/super-campaigns/:id/enrollments/self', auth, brandAccess, am(patchMyEnrollment))
  app.delete('/email/super-campaigns/:id/enrollments/self', auth, brandAccess, am(unenrollMe)) // For agent

  app.post('/email/super-campaigns', auth, brandAccess, am(create))
  app.get('/email/super-campaigns/:id', auth, brandAccess, am(get))
  app.put('/email/super-campaigns/:id', auth, brandAccess, am(update))
  app.delete('/email/super-campaigns/:id', auth, brandAccess, am(deleteSuperCampaign))
  app.put('/email/super-campaigns/:id/eligibility', auth, brandAccess, am(updateBrands))
  app.get('/email/super-campaigns/:id/enrollments', auth, brandAccess, am(getEnrollments))

  app.put('/email/super-campaigns/:id/tags', auth, brandAccess, am(updateTags))

  app.post('/email/super-campaigns/filter', auth, brandAccess, am(filter))
  app.get('/email/super-campaigns/:id/results', auth, brandAccess, am(getResults))
  app.post('/email/super-campaigns/:id/enrollments', auth, brandAccess, am(enroll)) // For admin
  app.delete('/email/super-campaigns/:id/enrollments', auth, brandAccess, am(unenroll)) // For admin

  app.get('/email/super-campaigns/:id/eligible/agents', auth, brandAccess, am(getEligibleAgents))
}

module.exports = router
