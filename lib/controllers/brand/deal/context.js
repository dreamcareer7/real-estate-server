const _ = require('lodash')
const expect = require('../../../utils/validator').expect
const BrandContext = require('../../../models/Brand/deal/context')
const BrandChecklist = require('../../../models/Brand/deal/checklist/get')
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

  // context.checklists is an array of: [{checklist, is_required}, {checklis, is_required}]
  const checklist_ids = context.checklists.map(c => c.checklist) 
  const checklists = await BrandChecklist.getAll(checklist_ids)

  const brands = [...checklists.map(c => c.brand), context.brand]

  const access = await Brand.hasAccessToBrands(brands, req.user.id, ['Admin'])

  if (access[context.brand])
    await BrandContext.update(context)

  for(const checklist of checklists)
    if (!access[checklist.brand])
      throw new Error.Forbidden()

  await BrandContext.setChecklistsForBrand(context.id, context.checklists, req.params.id)

  const updated = await BrandContext.get(context.id)
  res.model(updated)
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

const sortContexts = async (req, res) => {
  const items = req.body

  const contexts = await BrandContext.getAll(items.map(i => i.id))

  await BrandContext.sort(items)

  for(const context of contexts)
    expect(context.brand).to.equal(req.params.id)

  res.status(200)
  res.end()
}

const router = function ({app, b, access, am}) {
  app.post('/brands/:id/contexts', b, access, am(addContext))
  app.put('/brands/:id/contexts/sort', b, access, am(sortContexts))
  app.put('/brands/:id/contexts/:cid', b, access, am(updateContext))
  app.delete('/brands/:id/contexts/:cid', b, access, am(deleteContext))
  app.get('/brands/:id/contexts', b, access, am(getContexts))
}

module.exports = router
