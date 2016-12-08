const expect = require('../utils/validator').expect

function create (req, res) {
  const website = req.body
  website.user = req.user.id

  Website.create(website, (err, website) => {
    if (err)
      return res.error(err)

    res.model(website)
  })
}

function update(req, res) {
  const website = req.body
  website.user = req.user.id

  expect(req.params.id).to.be.uuid

  Website.get(req.params.id, (err, old) => {
    if (err)
      res.error(err)

    if (old.user !== req.user.id)
      return res.error(Error.Forbidden())

    Website.update(req.params.id, website, (err, website) => {
      if (err)
        return res.error(err)

      res.model(website)
    })
  })
}

function get(req, res) {
  expect(req.params.id).to.be.uuid

  Website.get(req.params.id, (err, website) => {
    if (err)
      return res.error(err)

    res.model(website)
  })
}

function addHostname(req, res) {
  const options = req.body
  options.website = req.params.id

  expect(req.params.id).to.be.uuid

  Website.addHostname(options, (err, website) => {
    if (err)
      return res.error(err)

    res.model(website)
  })
}

function search(req, res) {
  const hostname = req.query.hostname

  expect(hostname).to.be.a('string')

  Website.getByHostname(hostname, function (err, website) {
    if (err)
      return res.error(err)

    return res.model(website)
  })
}

function getUserWebsites(req, res) {
  Website.getByUser(req.user.id, (err, websites) => {
    if (err)
      return res.error(err)

    res.collection(websites)
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.get('/websites', b(getUserWebsites))
  app.post('/websites', b(create))
  app.get('/websites/search', search)
  app.get('/websites/:id', get)
  app.put('/websites/:id', b(update))
  app.post('/websites/:id/hostnames', b(addHostname))
}

module.exports = router
