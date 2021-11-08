const am = require('../utils/async_middleware.js')
const { expect } = require('../utils/validator')

const SuperCampaign = {
  ...require('../models/Email/super_campaign/get'),
  ...require('../models/Email/super_campaign/update'),
  ...require('../models/Email/super_campaign/create'),
  ...require('../models/Email/super_campaign/filter'),
}

const Enrollment = {
  ...require('../models/Email/super_campaign/enrollment/get'),
  ...require('../models/Email/super_campaign/enrollment/upsert'),
  ...require('../models/Email/super_campaign/enrollment/delete'),
}

const Brand = {
  ...require('../models/Brand/access'),
  ...require('../models/Brand/get'),
}

/**
 * @template TParams
 * @template TQuery
 * @template TBody
 * @typedef {import('../../types/monkey/controller').IAuthenticatedRequest<TParams, TQuery, TBody>} IAuthenticatedRequest
 */

/**
 * @typedef {import('../../types/monkey/controller').IResponse} IResponse
 * @typedef {import('../models/Email/super_campaign/types').Filter} SuperCampaignFilter
 * @typedef {import('../models/Email/super_campaign/types').SuperCampaignStored} SuperCampaignStored
 * @typedef {IAuthenticatedRequest<{}, {}, SuperCampaignFilter>} FilterRequest
 * @typedef {import('express-serve-static-core').NextFunction} NextFunction
 */

/** @returns {IBrand['id']} */
function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id) throw Error.BadRequest('Brand is not specified.')

  return brand.id
}

/**
 * @param {IAuthenticatedRequest<unknown, unknown, unknown>} req
 * @param {IResponse} res
 * @param {NextFunction} next
 */
function brandAccess(req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  return Brand.limitAccess({ user, brand }).nodeify(err => {
    if (err) {
      return res.error(err)
    }

    next()
  })
}

/** @param {IBrand['id'][]} brandIds */
async function ensureChildrenOfCurrentBrand (brandIds) {  
  const currentBrandId = getCurrentBrand()
  
  for (const brandId of [...new Set(brandIds)]) {
    if (brandId === currentBrandId) { continue }

    expect(brandId).to.be.uuid
    
    const parentIds = await Brand.getParents(brandId)
    if (!parentIds.includes(currentBrandId)) {
      throw Error.Forbidden(`Current brand is not parent of brand ${brandId}`)
    }
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

/**
 * @param {SuperCampaignStored} superCampaign
 */
function ensureNonExecuted (superCampaign) {
  expect(superCampaign).to.be.an('object', 'Impossible state')
    .that.has.own.property(
      'executed_at', null,
      `Super Campaign ${superCampaign.id} already executed`
    )
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, {}>} req 
 * @param {IResponse} res 
 */
async function get(req, res) {
  expect(req.params.id).to.be.uuid
  const showing = await SuperCampaign.get(req.params.id)
  res.model(showing)
}

/**
 * @param {IAuthenticatedRequest<{}, {}, import('../models/Email/super_campaign/types').SuperCampaignApiInput>} req 
 * @param {IResponse} res 
 */
async function create(req, res) {
  const id = await SuperCampaign.create(req.body, req.user.id, getCurrentBrand())

  const created = await SuperCampaign.get(id)

  return res.model(created)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, import('../models/Email/super_campaign/types').SuperCampaignApiInput>} req 
 * @param {IResponse} res 
 */
async function update(req, res) {
  const superCampaignId = req.params.id
  
  expect(superCampaignId).to.be.uuid
  await SuperCampaign.get(superCampaignId).then(ensureNonExecuted)
  
  await SuperCampaign.update(superCampaignId, req.body)
  const updated = await SuperCampaign.get(superCampaignId)

  return res.model(updated)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, { tags: string[] }>} req 
 * @param {IResponse} res 
 */
async function updateTags(req, res) {
  const superCampaignId = req.params.id
  const { tags } = req.body
  
  expect(superCampaignId).to.be.uuid
  await SuperCampaign.get(superCampaignId).then(ensureNonExecuted)
  
  await SuperCampaign.updateTags(superCampaignId, tags)
  const updated = await SuperCampaign.get(superCampaignId)

  return res.model(updated)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, { eligible_brands: UUID[] }>} req 
 * @param {IResponse} res 
 */
async function updateBrands(req, res) {
  const superCampaignId = req.params.id
  const { eligible_brands } = req.body
  
  expect(superCampaignId).to.be.uuid
  expect(eligible_brands).to.be.an('array')
  await SuperCampaign.get(superCampaignId).then(ensureNonExecuted)
  
  await SuperCampaign.updateBrands(superCampaignId, req.body.eligible_brands)
  const updated = await SuperCampaign.get(superCampaignId)

  return res.model(updated)
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, PaginationOptions, {}>} req 
 * @param {IResponse} res 
 */
async function getEnrollments(req, res) {
  expect(req.params.id).to.be.uuid

  const enrollments = await Enrollment.filter({
    ...req.query,
    super_campaign: req.params.id,
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
  const superCampaigns = await SuperCampaign.filter(filterOpts)

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
  const { id: super_campaign } = req.params
  const { enrollments: data } = req.body

  await SuperCampaign.get(super_campaign).then(ensureNonExecuted)
  
  expect(data, 'You need to specify the array of new enrollments in the field `enrollments`').to.be.an('array').that.is.not.empty
  await ensureChildrenOfCurrentBrand(data.map(d => d.brand))

  const inputs = data.map(({ user, brand, tags }) => {
    expect(user).to.be.uuid
    validateTags(tags)
    // TODO: ensure that `user` belongs to the `brand`

    return { super_campaign, user, brand, tags, detached: false }
  })

  const ids = await Enrollment.upsertMany(inputs)
  const enrollments = await Enrollment.getAll(ids)

  res.status(201) // XXX: always 201? even in case of update?
    .collection(enrollments)
}

/**
 * @typedef {Object} EnrollMeRequestBody
 * @property {string[] | undefined} tags
 *
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, EnrollMeRequestBody>} req 
 * @param {IResponse} res 
 */
async function enrollMe(req, res) {
  const superCampaign = await SuperCampaign.get(req.params.id)
  const tags = req.body.tags || superCampaign.tags

  ensureNonExecuted(superCampaign)
  validateTags(tags)
  
  const [enrollmentId] = await Enrollment.upsertMany([{
    super_campaign: req.params.id,
    brand: getCurrentBrand(),
    user: req.user.id,
    tags: /** @type {string[]} */(tags),
    detached: true,
  }])
  const enrollment = await Enrollment.get(enrollmentId)

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
  // XXX: ATM we're ignoring req.params.enrollment
  
  const { id: superCampaignId } = req.params
  const { user, brand } = req.body

  expect(user).to.be.uuid
  // TODO: ensure that `user` belongs to the `brand`
  await ensureChildrenOfCurrentBrand([brand])

  await Enrollment.deleteBy({ brandId: brand, userId: user, superCampaignId })

  res.status(204).end()
}

/**
 * @param {IAuthenticatedRequest<{ id: UUID }, {}, {}>} req 
 * @param {IResponse} res 
 */
async function unenrollMe(req, res) {
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
    order: ['-updated_at', '-created_at'],
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

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/email/super-campaigns/self', brandAccess, am(myEligibleSuperCampaigns))
  app.get('/email/super-campaigns/enrollments/self', brandAccess, am(myEnrollments))
  app.put('/email/super-campaigns/:id/enrollments/self', auth, brandAccess, am(enrollMe)) // For agent
  app.delete('/email/super-campaigns/:id/enrollments/self', auth, brandAccess, am(unenrollMe)) // For agent

  app.post('/email/super-campaigns', auth, brandAccess, am(create))
  app.get('/email/super-campaigns/:id', auth, brandAccess, am(get))
  app.put('/email/super-campaigns/:id', auth, brandAccess, am(update))
  app.put('/email/super-campaigns/:id/eligibility', auth, brandAccess, am(updateBrands))
  app.get('/email/super-campaigns/:id/enrollments', auth, brandAccess, am(getEnrollments))

  app.put('/email/super-campaigns/:id/tags', auth, brandAccess, am(updateTags))

  app.post('/email/super-campaigns/filter', auth, brandAccess, am(filter))
  app.get('/email/super-campaigns/:id/results', auth, brandAccess, am(getResults))
  app.post('/email/super-campaigns/:id/enrollments', auth, brandAccess, am(enroll)) // For admin
  app.delete('/email/super-campaigns/:id/enrollments/:enrollment', auth, brandAccess, am(unenroll)) // For admin
}

module.exports = router
