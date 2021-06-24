const _ = require('lodash')
const expect = require('../../../utils/validator').expect
const BrandContext = require('../../../models/Brand/deal/context')
const Brand = require('../../../models/Brand/access')

const addContext = async (req, res) => {
  const context = req.body
  context.brand = req.params.id

  const contexts = await BrandContext.getByBrand(context.brand)
  const found = _.find(contexts, {
    key: context.key
  })

  if (found)
    throw new Error.Conflict(`Context ${context.key} already exists`)

  const saved = await BrandContext.create(context)

  res.model(saved)
}

const updateContext = async (req, res) => {
  const context = req.body
  context.id = req.params.cid

  const contexts = await BrandContext.getByBrand(req.params.id)
  const found = _.find(contexts, {
    key: context.key
  })

  if (found && found.id !== context.id)
    throw new Error.Conflict(`Context ${context.key} already exists`)

  /*
   * Why another check?
   * Because this endpoint basically allows 2 things:
   * 1. Updating brand_context
   * 2. Updating checklists relationship to a context
   * Now, imagine a common scenario where contexts are defined on root brand
   * But checklists are defined on regional brands
   * Imaginary Realty     <---- This is where contexts are
   *    California        <---- This is where checklists are 
   *    Texass            <---- This is where checklists are
   * This scenario means you are gonna have to call this endpoint from child brands.
   * This makes sure you have such access.
   */


  await Brand.limitAccess({
    brand: found.brand, 
    user: req.user.id,
    roles: ['Admin']
  })

  const saved = await BrandContext.update(context)

  res.model(saved)
}

const deleteContext = async (req, res) => {
  const context = await BrandContext.get(req.params.cid)

  expect(context.brand).to.equal(req.params.id)

  await BrandContext.delete(req.params.cid)

  res.status(204)
  return res.end()
}

const getContexts = async (req, res) => {
  const contexts = await BrandContext.getByBrand(req.params.id)
  res.collection(contexts)
}

const router = function ({app, b, access, am}) {
  app.post('/brands/:id/contexts', b, access, am(addContext))
  app.put('/brands/:id/contexts/:cid', b, access, am(updateContext))
  app.delete('/brands/:id/contexts/:cid', b, access, am(deleteContext))
  app.get('/brands/:id/contexts', b, access, am(getContexts))
}

module.exports = router
