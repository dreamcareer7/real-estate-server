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

const router = function (app) {
  app.get('/brands/search', app.auth.optionalBearer(search))
  app.get('/brands/:id', app.auth.optionalBearer(get))
}

module.exports = router
