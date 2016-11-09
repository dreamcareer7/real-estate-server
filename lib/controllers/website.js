function create (req, res) {
  const website = req.body
  website.user = req.user.id

  Website.create(website, (err, website) => {
    if (err)
      return res.error(err)

    res.model(website)
  })
}

function get(req, res) {
  Website.get(req.params.id, (err, website) => {
    if (err)
      return res.error(err)

    res.model(website)
  })
}

function addHostname(req, res) {
  const options = req.body
  options.website = req.params.id

  Website.addHostname(options, (err, website) => {
    if (err)
      return res.error(err)

    res.model(website)
  })
}

function search (req, res) {
  const hostname = req.query.hostname

  Website.getByHostname(hostname, function (err, website) {
    if (err)
      return res.error(err)

    return res.model(website)
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.post('/websites', b(create))
  app.get('/websites/search', search)
  app.get('/websites/:id', get)
  app.post('/websites/:id/hostnames', b(addHostname))
}

module.exports = router
