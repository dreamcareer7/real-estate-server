const expect = require('../utils/validator.js').expect


function getDeal (req, res) {
  const id = req.params.id

  expect(id).to.be.uuid

  Deal.get(id, function (err, deal) {
    if (err)
      return res.error(err)

    res.model(deal)
  })
}

function createDeal(req, res) {
  const deal = req.body

  deal.created_by = req.user.id

  Deal.create(deal, (err, deal) => {
    if (err)
      return res.error(err)

    res.model(deal)
  })
}

function addRole(req, res) {
  const role = req.body

  role.created_by = req.user.id
  role.deal = req.params.id

  console.log(role)
  expect(role.deal).to.be.uuid

  Deal.addRole(role, (err, deal) => {
    if (err)
      return res.error(err)

    res.model(deal)
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.post('/deals', b(createDeal))
  app.get('/deals/:id', b(getDeal))
  app.post('/deals/:id/roles', b(addRole))
}

module.exports = router