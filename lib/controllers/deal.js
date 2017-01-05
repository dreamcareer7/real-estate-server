const expect = require('../utils/validator.js').expect

function getDeal (req, res) {
  req.access.deny('Client')

  const id = req.params.id

  expect(id).to.be.uuid

  Deal.get(id, function (err, deal) {
    if (err)
      return res.error(err)

    if (deal.created_by !== req.user.id)
      return res.error(Error.Unauthorized())

    res.model(deal)
  })
}

function getDeals (req, res) {
  req.access.deny('Client')

  Deal.getUserDeals(req.user.id, function (err, deals) {
    if (err)
      return res.error(err)

    res.collection(deals)
  })
}

function createDeal(req, res) {
  req.access.deny('Client')

  const deal = req.body

  deal.created_by = req.user.id

  if (!deal.listing && !deal.address)
    return res.error(Error.Validation('Provide listing or address'))

  Deal.create(deal, (err, deal) => {
    if (err)
      return res.error(err)

    res.model(deal)
  })
}

function addRole(req, res) {
  req.access.deny('Client')

  const role = req.body

  role.created_by = req.user.id
  role.deal = req.params.id

  expect(role.deal).to.be.uuid

  Deal.addRole(role, (err, deal) => {
    if (err)
      return res.error(err)

    if (deal.created_by !== req.user.id)
      return res.error(Error.Forbidden())

    res.model(deal)
  })
}

function deleteDeal(req, res) {
  const deal_id = req.params.id

  expect(deal_id).to.be.uuid

  Deal.delete(deal_id, err => {
    if(err)
      return res.error(err)

    res.status(200)
    return res.end()
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.post('/deals', b(createDeal))
  app.get('/deals', b(getDeals))
  app.get('/deals/:id', b(getDeal))
  app.delete('/deals/:id', b(deleteDeal))
  app.post('/deals/:id/roles', b(addRole))
}

module.exports = router
