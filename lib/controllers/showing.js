const Brand = require('../models/Brand/index.js')
const am = require('../utils/async_middleware.js')
const { expect } = require('../utils/validator')
const Showing = {
  ...require('../models/Showing/showing/access'),
  ...require('../models/Showing/showing/create'),
  ...require('../models/Showing/showing/filter'),
  ...require('../models/Showing/showing/get'),
  ...require('../models/Showing/showing/validate'),
}

/**
 * @returns {UUID}
 */
function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id)
    throw Error.BadRequest('Brand is not specified.')
  
  return brand.id
}

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

function showingAccess(req, res, next) {
  const user = req.user.id

  Showing.hasAccess(req.params.id, user).nodeify((err, access) => {
    if (err) {
      return res.error(err)
    }

    if (!access) {
      throw Error.Forbidden('Access to the showing is forbidden')
    }

    next()
  })
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID }, {}, {}>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function getShowing(req, res) {
  expect(req.params.id).to.be.uuid
  const showing = await Showing.get(req.params.id)
  res.model(showing)
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{}, {}, import('../models/Showing/showing/types.js').ShowingFilterOptions>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function filterShowings(req, res) {
  const brand = getCurrentBrand()

  const { ids, total } = await Showing.filter(brand, {
    deal: req.body.deal,
    listing: req.body.listing,
    live: req.body.live
  })

  const rows = await Showing.getAll(ids)
  if (rows.length === 0) {
    res.collection([])
  }
  else {
    // @ts-ignore
    rows[0].total = total
  
    await res.collection(rows)
  }
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{}, {}, import('../models/Showing/showing/types.js').ShowingInput>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function createShowing(req, res) {
  const brand = getCurrentBrand()
  const user = req.user.id

  Showing.validate(req.body)
  const id = await Showing.create(req.body, user, brand)
  res.model(await Showing.get(id))
}

/**
 * @param {import('../../types/monkey/controller').IRechatApp} app 
 */
const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/showings/filter', auth, brandAccess, am(filterShowings))
  app.post('/showings', auth, brandAccess, am(createShowing))
  app.get('/showings/:id', auth, showingAccess, am(getShowing))
}

module.exports = router
