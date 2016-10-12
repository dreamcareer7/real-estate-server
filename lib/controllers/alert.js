const _u = require('underscore')

function prepareAlert (req, alert) {
  if (req.user)
    alert.created_by = req.user.id

  let order = req.query.order_by || []
  const office = req.query.office

  if (order.length < 1)
    order = [ 'status' ]

  if (_u.indexOf(order, 'office') !== -1 && !office)
    return req.res.error(Error.Validation('You request office sort, but did not specify the office MLS ID'))

  alert.sort_order = order
  alert.sort_office = (_u.indexOf(order, 'office') !== -1 && office) ? office : null
  alert.limit = parseInt(alert.limit) || parseInt(req.query.limit) || null
  alert.offset = req.query.offset || null
}

function createAlert (req, res) {
  const room_id = req.params.id
  const alert = req.body

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

  Alert.getForRoom(room_id, paging, function (err, alerts) {
    if (err)
      return res.error(err)

    return res.collection(alerts)
  })
}

function get (req, res) {
  const alert_id = req.params.id

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

  Alert.delete(alert_id, function (err) {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function stringSearch (req, res) {
  const user_id = req.user.id
  const strings = req.query.q || []

  Alert.stringSearch(user_id, strings, function (err, alerts) {
    if (err)
      return res.error(err)

    return res.collection(alerts)
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.post('/valerts', app.auth.optionalBearer(checkAlert))
  app.post('/rooms/:id/alerts', b(createAlert))
  app.put('/rooms/:rid/alerts/:id', b(patchAlert))
  app.get('/rooms/:id/alerts', b(getAlertsForRoom))
  app.get('/alerts', b(getAlertsForUser))
  app.delete('/rooms/:rid/alerts/:id', b(deleteAlert))
  app.get('/alerts/search', b(stringSearch))
  app.get('/alerts/:id', b(get))
}

module.exports = router
