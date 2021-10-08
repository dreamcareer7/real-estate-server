const expect = require('../../../utils/validator').expect

const BrandStatus = require('../../../models/Brand/deal/status')

const createStatus = async (req, res) => {
  const status = req.body

  const saved = await BrandStatus.create({
    ...status,
    brand: req.params.id
  })

  res.model(saved)
}

const updateStatus = async (req, res) => {
  const updated = await BrandStatus.update(req.params.id, {
    ...req.body,
    id: req.params.status
  })

  res.model(updated)
}

const deleteStatus = async (req, res) => {
  const status = await BrandStatus.get(req.params.status)
  expect(status.brand).to.equal(req.params.id)

  await BrandStatus.delete(req.params.status)

  res.status(204)
  res.end()
}

const getStatuses = async (req, res) => {
  const statuses = await BrandStatus.getByBrand(req.params.id)

  res.collection(statuses)
}

const router = function ({app, b, access, am}) {
  app.post('/brands/:id/deals/statuses', b, access, am(createStatus))
  app.put('/brands/:id/deals/statuses/:status', b, access, am(updateStatus))
  app.delete('/brands/:id/deals/statuses/:status', b, access, am(deleteStatus))
  app.get('/brands/:id/deals/statuses', b, access, am(getStatuses))
}

module.exports = router
