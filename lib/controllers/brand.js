const expect = require('../utils/validator').expect

function get (req, res) {
  const brand_id = req.params.id

  expect(brand_id).to.be.uuid

  Brand.get(brand_id, function (err, brand) {
    if (err)
      return res.error(err)

    return res.model(brand)
  })
}

function getRoom (req, res) {
  const brand_id = req.params.id

  expect(brand_id).to.be.uuid

  Brand.getRoom({
    brand: brand_id,
    user: req.user.id
  }, (err, room) => {
    if (err)
      return res.error(err)

    if (room)
      return res.model(room)

    res.error(Error.ResourceNotFound())
  })
}

function search (req, res) {
  const hostname = req.query.hostname

  expect(hostname).to.be.a('string').and.to.have.length.above(4)

  Brand.getByHostname(hostname, function (err, brand) {
    if (err)
      return res.error(err)

    return res.model(brand)
  })
}

function setBrand(req, res, next) {
  let brand_id

  if (req.headers['x-rechat-brand'])
    brand_id = req.headers['x-rechat-brand']
  else if(req.user)
    brand_id = req.user.brand

  if(!brand_id)
    return next()

  Brand.get(brand_id, (err, b) => {
    if(err)
      return res.error(err)

    process.domain.brand = b
    next()
  })
}

const router = function (app) {
  app.use(setBrand)
  app.get('/brands/search', search)
  app.get('/brands/:id', get)
  app.post('/brands/:id/room', app.auth.bearer(getRoom))
}

module.exports = router
