const BrandHostname = require('../../models/Brand/hostname')
const { expect } = require('../../utils/validator')

const addHostname = async (req, res) => {
  const hostname = req.body
  hostname.brand = req.params.id

  const brand = await BrandHostname.addHostname(hostname)
  res.model(brand)
}

const removeHostname = async (req, res) => {
  const brand = await BrandHostname.removeHostname(req.params.id, req.query.hostname)
  res.model(brand)
}

const search = async (req, res) => {
  const hostname = req.query.hostname

  expect(hostname).to.be.a('string').and.to.have.length.above(4)

  const brand = await BrandHostname.getByHostname(hostname)

  res.model(brand)
}


const router = function ({app, b, access, am}) {
  app.post('/brands/:id/hostnames', b, access, am(addHostname))
  app.delete('/brands/:id/hostnames', b, access, am(removeHostname))
  app.get('/brands/search', am(search))

}

module.exports = router
