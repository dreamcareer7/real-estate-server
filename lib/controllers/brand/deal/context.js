const _ = require('lodash')
const expect = require('../../../utils/validator').expect

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

  const saved = await BrandContext.update(context)

  expect(saved.brand).to.equal(req.params.id)

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
