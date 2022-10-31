const _u = require('lodash')
const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware')
const Alert = require('../models/Alert')
const Agent = require('../models/Agent')
const Orm = require('../models/Orm/context')
const UserAlertSetting = require('../models/Alert/setting')
const promisify = require('../utils/promisify')
const { isUUID } = require('../utils/validator')
const fixHeroku = require('../utils/fix-heroku')
const limiter = require('../utils/rate-limiter')
const Brand = require('../models/Brand/get')
const BrandMls = require('../models/Brand/mls')

function prepareAlert(req, alert) {
  if (req.user)
    alert.created_by = req.user.id

  let order = req.query.order_by || []
  expect(order).to.be.an('array')

  const office = req.query.office
  if (office)
    expect(office).to.be.a('string')

  if (order.length < 1)
    order = ['status']

  if (alert.mls) {
    order.unshift('mls')
  }

  if (_u.indexOf(order, 'office') !== -1 && !office)
    return req.res.error(Error.Validation('You requested office sort, but did not specify the office MLS ID'))

  if (!Array.isArray(alert.mls_areas))
    delete alert.mls_areas

  alert.sort_order = order
  alert.sort_office = (_u.indexOf(order, 'office') !== -1 && office) ? office : null
  alert.limit = parseInt(alert.limit) || parseInt(req.query.limit) || null
  alert.offset = req.query.offset || null
}

function createAlert(req, res) {
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

async function listingsAgents(req, res) {
  const alert = req.body

  fixHeroku(req)

  if (req.user?.agent) {
    const agent = await Agent.get(req.user.agent)
    alert.mls = agent.mls
  }

  prepareAlert(req, alert)
  // await applyBrandMlsLimitation(alert)
  alert.limit = false

  const statsResult = await Alert.agents(alert)
  const agentsStats = {}
  for (const stats of statsResult.rows) {
    if (!agentsStats[stats.selling_agent]) {
      agentsStats[stats.selling_agent] = { selling: 0, listing: 0, volume_in: 0, avg_price: 0 }
    }
    if (!agentsStats[stats.list_agent]) {
      agentsStats[stats.list_agent] = { selling: 0, listing: 0, volume_in: 0, avg_price: 0 }
    }

    agentsStats[stats.selling_agent].selling = stats.selling_count
    agentsStats[stats.selling_agent].volume_in += stats.selling_sum_price
    agentsStats[stats.list_agent].listing = stats.count
    agentsStats[stats.list_agent].volume_in += stats.sum_price
  }

  const agents = await Agent.getAll(Object.keys(agentsStats).filter(id => isUUID(id)))

  agents.map(a => {
    const stats = agentsStats[a.id]
    stats.avg_price = stats.volume_in / (stats.selling + stats.listing)
    a.stats = stats
  })

  agents.sort((a, b) => {
    if (a.stats.volume_in < b.stats.volume_in) return 1
    if (a.stats.volume_in > b.stats.volume_in) return -1
    return 0
  }).slice(0, 10000)

  return res.collection(agents)
}

async function applyBrandMlsLimitation(alert) {
  const brand = Brand.getCurrent()
  if (brand) {
    const enabled_mls = await BrandMls.getForBrand(brand.id)

    // For now, if no mls is enabled for a brand, don't enforce a limitation.
    // FIXME: remove this condition when all brands have been set up.
    if (Array.isArray(enabled_mls) && enabled_mls.length > 0) {
      if (alert.mls_filter) {
        alert.mls_filter = _u.intersection(alert.mls_filter, enabled_mls)
      } else {
        alert.mls_filter = enabled_mls
      }
    }
  }
}

async function checkAlert(req, res) {
  const alert = req.body

  Orm.setAssociationConditions({
    'property.address': {
      get_private_address: false
    }
  })

  if (req.user?.agent) {
    const agents = await Agent.getAll(req.user.agents)
    alert.mls = agents.map(a => a.mls)
  }

  prepareAlert(req, alert)
  await applyBrandMlsLimitation(alert)

  const compact_listings = await promisify(Alert.check)(alert)

  return res.collection(compact_listings, {
    proposed_title: Alert.proposeTitle(alert)
  })
}

async function countAlert(req, res) {
  const alert = req.body

  if (req.user?.agent) {
    const agents = await Agent.getAll(req.user.agents)
    alert.mls = agents.map(a => a.mls)
  }

  prepareAlert(req, alert)
  await applyBrandMlsLimitation(alert)

  const total = await promisify(Alert.count)(alert)

  res.json({
    code: 'OK',
    info: {
      total
    }
  })
}

function patchAlert(req, res) {
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

function getAlertsForRoom(req, res) {
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

function get(req, res) {
  const alert_id = req.params.id

  expect(alert_id).to.be.uuid

  Alert.get(alert_id, (err, alert) => {
    if (err)
      return res.error(err)

    return res.model(alert)
  })
}

function getAlertsForUser(req, res) {
  const user_id = req.user.id
  const paging = {}
  req.pagination(paging)

  Alert.getForUser(user_id, paging, function (err, alerts) {
    if (err)
      return res.error(err)

    return res.collection(alerts)
  })
}

function deleteAlert(req, res) {
  const alert_id = req.params.id

  expect(alert_id).to.be.uuid

  Alert.delete(alert_id, req.user, function (err) {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function stringSearch(req, res) {
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
  expect(status).to.be.an('array')

  await UserAlertSetting.update(userID, alertID, status)
  const alert = await promisify(Alert.get)(alertID)
  res.model(alert)
}

const router = function (app) {
  const b = app.auth.bearer

  app.post('/valerts', limiter, am(checkAlert))
  app.post('/valerts/count', limiter, am(countAlert))
  app.post('/listings/filter/agents', am(listingsAgents))
  app.post('/rooms/:id/alerts', b(createAlert))
  app.put('/rooms/:rid/alerts/:id', b(patchAlert))
  app.get('/rooms/:id/alerts', b(getAlertsForRoom))
  app.get('/alerts', b(getAlertsForUser))
  app.delete('/rooms/:rid/alerts/:id', b(deleteAlert))
  app.get('/alerts/search', b(stringSearch))
  app.get('/alerts/:id', b(get))
  app.patch('/alerts/:id/status', b.middleware, am(setStatus))
}

module.exports = router
