/**
 * @namespace controller/agent
 */

const config = require('../config.js')
const path = require('path')
const expect = require('../utils/validator').expect

function search (req, res) {
  let id

  if (req.query.mlsid) {
    id = req.query.mlsid
    id = ObjectUtil.trimLeadingZeros(id)

    expect(id).to.be.a('string').and.to.have.length.above(2)

    Agent.getByMLSID(id, (err, agent) => {
      if (err)
        return res.error(err)

      return res.model(agent)
    })
  } else if (req.query.officemlsid) {
    id = req.query.officemlsid

    expect(id).to.be.a('string').and.to.have.length.above(4)

    Agent.getByOfficeId(id, (err, agents) => {
      if (err)
        return res.error(err)

      return res.collection(agents)
    })
  } else if (req.query.q) {
    expect(req.query.q).to.be.a('string').and.to.have.length.above(2)

    Agent.search(req.query.q, (err, agents) => {
      if (err)
        res.error(err)

      res.collection(agents)
    })
  } else {
    return res.error(Error.Validation('Malformed search query'))
  }
}

function get (req, res) {
  const agent_id = req.params.id

  expect(agent_id).to.be.uuid

  Agent.get(agent_id, (err, agent) => {
    if (err)
      return res.error(err)

    return res.model(agent)
  })
}

function report (req, res) {
  Agent.report(req.body.criteria, (err, report) => {
    if (err)
      return res.error(err)

    res.collection(report)
  })
}

function create (req, res) {
  if (config.webapp.hostname === 'rechat.com') //For god's sake WTF is this.
    return res.error(Error.MethodNotAllowed())

  const agent = req.body

  Agent.create(agent, (err) => {
    if (err) {
      console.log(err)
      return res.error(err)
    }

    res.status(201)
    return res.end()
  })
}

function form (req, res) {
  res.sendFile(path.resolve(__dirname + '/../html/agent/create.html'))
}

const router = function (app) {
  const b = app.auth.bearer
  const ob = app.auth.optionalBearer

  app.get('/agents/create', form)
  app.post('/agents', create)
  app.get('/agents/search', ob(search))
  app.get('/agents/:id', b(get))
  app.post('/agents/report', b(report))
}

module.exports = router
