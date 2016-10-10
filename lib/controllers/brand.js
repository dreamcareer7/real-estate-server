function get (req, res) {
  const brand_id = req.params.id

  Brand.get(brand_id, function (err, brand) {
    if (err)
      return res.error(err)

    return res.model(brand)
  })
}

function search (req, res) {
  const hostname = req.query.hostname

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
  app.get('/brands/search', app.auth.optionalBearer(search))
  app.get('/brands/:id', app.auth.optionalBearer(get))
}

module.exports = router
