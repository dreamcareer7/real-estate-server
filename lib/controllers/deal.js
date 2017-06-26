const expect = require('../utils/validator.js').expect

function getDeal (req, res) {
  req.access.deny('Client')

  const id = req.params.id

  expect(id).to.be.uuid

  Deal.get(id, function (err, deal) {
    if (err)
      return res.error(err)

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
  if (!req.user.features || req.user.features.indexOf('Deals') < 0)
    return res.error(Error.Forbidden())

  req.access.deny('Client')

  const deal = req.body

  deal.created_by = req.user.id

  if (!deal.listing && !(deal.context && deal.context.full_address))
    return res.error(Error.Validation('Provide listing or full address'))

  Deal.create(deal, (err, deal) => {
    if (err)
      return res.error(err)

    res.model(deal)
  })
}

function deleteDeal(req, res) {
  const deal_id = req.params.id

  expect(deal_id).to.be.uuid

  Deal.delete(deal_id, err => {
    if(err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function attach(req, res) {
  AttachedFile.saveFromRequest({
    path: req.params.id,
    req,
    relations: [
      {
        role: 'Deal',
        id: req.params.id
      }
    ]
  }, (err, file) => {
    if (err)
      res.error(err)

    res.model(file)
  })
}

function brandDeals(req, res) {
  Brand.limitAccess({
    user: req.user.id,
    brand: req.params.brand,
  }).nodeify(err => {
    if (err)
      return res.error(err)

    Deal.getBrandDeals(req.params.brand, (err, deals) => {
      if (err)
        return res.error(err)

      res.collection(deals)
    })
  })
}

const access = (req, res, next) => {
  expect(req.params.id).to.be.uuid

  Deal.limitAccess({
    user: req.user,
    deal_id: req.params.id
  }, err => {
    if (err)
      res.error(err)

    next()
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

    res.model(deal)
  })
}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/deals', auth, createDeal)
  app.get('/deals', auth, getDeals)
  app.get('/deals/:id', auth, access, getDeal)
  app.delete('/deals/:id', auth, access, deleteDeal)
  app.post('/deals/:id/roles', auth, access, addRole)
  app.post('/deals/:id/files', auth, access, attach)
  app.get('/brands/:brand/deals', auth, brandDeals)
}

module.exports = router
