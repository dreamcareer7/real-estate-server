const _u = require('underscore')
const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware')
const Alert = require('../models/Alert')

function prepareAlert (req, alert) {
  if (req.user)
    alert.created_by = req.user.id

  let order = req.query.order_by || []
  expect(order).to.be.an('array')

  const office = req.query.office
  if(office)
    expect(office).to.be.a('string')

  if (order.length < 1)
    order = [ 'status' ]

  if (_u.indexOf(order, 'office') !== -1 && !office)
    return req.res.error(Error.Validation('You requested office sort, but did not specify the office MLS ID'))

  if (!Array.isArray(alert.mls_areas))
    delete alert.mls_areas

  alert.sort_order = order
  alert.sort_office = (_u.indexOf(order, 'office') !== -1 && office) ? office : null
  alert.limit = parseInt(alert.limit) || parseInt(req.query.limit) || null
  alert.offset = req.query.offset || null
}

function createAlert (req, res) {
  const room_id = req.params.id
  const alert = req.body

  expect(room_id).to.be.uuid

  prepareAlert(req, alert)

  Alert.create(room_id, alert, (err, alert) => {
    if (err)
      return res.error(err)

    res.model(alert)
  })
}

function checkAlert(req, res) {
  const alert = req.body

  prepareAlert(req, alert)

  Listing.getStatuses((err, allStatuses) => {
    if(err)
      return res.error(err)

    alert.listing_statuses = req.body.listing_statuses ? req.body.listing_statuses : allStatuses

    Alert.check(alert, (err, compact_listings) => {
      if (err)
        return res.error(err)

      return res.collection(compact_listings, {
        proposed_title: Alert.proposeTitle(alert)
      })
    })
  })
}

function patchAlert (req, res) {
  const room_id = req.params.rid
  const user_id = req.user.id
  const alert_id = req.params.id
  const alert = req.body

  expect(room_id).to.be.uuid
  expect(alert_id).to.be.uuid

  Alert.patch(room_id, user_id, alert_id, alert, function (err, alert) {
    if (err)
      return res.error(err)

    return res.model(alert)
  })
}

function getAlertsForRoom (req, res) {
  const room_id = req.params.id
  const paging = {}
  req.pagination(paging)

  expect(room_id).to.be.uuid

  Alert.getForRoom(room_id, paging, function (err, alerts) {
    if (err)
      return res.error(err)

    return res.collection(alerts)
  })
}

function get (req, res) {
  const alert_id = req.params.id

  expect(alert_id).to.be.uuid

  Alert.get(alert_id, (err, alert) => {
    if (err)
      return res.error(err)

    return res.model(alert)
  })
}

function getAlertsForUser (req, res) {
  const user_id = req.user.id
  const paging = {}
  req.pagination(paging)

  Alert.getForUser(user_id, paging, function (err, alerts) {
    if (err)
      return res.error(err)

    return res.collection(alerts)
  })
}

function deleteAlert (req, res) {
  const alert_id = req.params.id

  expect(alert_id).to.be.uuid

  Alert.delete(alert_id, req.user, function (err) {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function stringSearch (req, res) {
  const user_id = req.user.id
  const strings = req.query.q || []

  expect(strings).to.be.an('array')

  Alert.stringSearch(user_id, strings, function (err, alerts) {
    if (err)
      return res.error(err)

    return res.collection(alerts)
  })
}

async function setStatus(req, res) {
  const userID = req.user.id
  const alertID = req.params.id
  const status = req.body.status

  expect(userID).to.be.uuid
  expect(alertID).to.be.uuid
  expect(status).to.be.a('string')
  
  await Alert.setState(userID, alertID, status)
  res.sendStatus(204)
  res.end()
}

async function getStatus(req, res) {
  const userID = req.user.id
  const alertIDs = req.body.ids
  
  expect(userID).to.be.uuid
  expect(alertIDs).to.be.an('array')

  const status = await Alert.getState(userID, alertIDs)
  res.json(status)
}

const router = function (app) {
  const b = app.auth.bearer

  app.post('/valerts', checkAlert)
  app.post('/rooms/:id/alerts', b(createAlert))
  app.put('/rooms/:rid/alerts/:id', b(patchAlert))
  app.get('/rooms/:id/alerts', b(getAlertsForRoom))
  app.get('/alerts', b(getAlertsForUser))
  app.delete('/rooms/:rid/alerts/:id', b(deleteAlert))
  app.get('/alerts/search', b(stringSearch))
  app.get('/alerts/:id', b(get))
  app.patch('/alerts/:id/status', b.middleware, am(setStatus))
  app.post('/alerts/status', b.middleware, am(getStatus))
}

module.exports = router
