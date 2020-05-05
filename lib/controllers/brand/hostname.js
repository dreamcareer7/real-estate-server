const addHostname = async (req, res) => {
  const hostname = req.body
  hostname.brand = req.params.id

  const brand = await Brand.addHostname(hostname)
  res.model(brand)
}

const removeHostname = async (req, res) => {
  const brand = await Brand.removeHostname(req.params.id, req.query.hostname)
  res.model(brand)
}

const router = function ({app, b, access, am}) {
  app.post('/brands/:id/hostnames', b, access, am(addHostname))
  app.delete('/brands/:id/hostnames', b, access, am(removeHostname))

}

module.exports = router
