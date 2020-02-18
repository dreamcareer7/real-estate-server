const expect = require('../../utils/validator').expect
const BrandList = require('../../models/Brand/list')

const addList = async (req, res) => {
  expect(req.body).to.be.an('array')

  const ids = await BrandList.createAll(req.params.id, req.body)
  const saved = await BrandList.getAll(ids)

  return res.collection(saved)
}

const getLists = async (req, res) => {
  const lists = await BrandList.getForBrand(req.params.id)

  res.collection(lists)
}

const router = function ({app, b, access, am}) {
  app.post('/brands/:id/lists', b, access, am(addList))
  app.get('/brands/:id/lists', b, access, am(getLists))
}

module.exports = router
