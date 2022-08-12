const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware.js')
const Agent = require('../models/Agent')
const ObjectUtil = require('../models/ObjectUtil')

const search = async (req, res) => {
  let id

  if (req.query.mlsid) {
    id = req.query.mlsid
    id = ObjectUtil.trimLeadingZeros(id)

    const agents = await Agent.getByMLSID(id)
    return res.collection(agents)
  }

  if (req.query.officemlsid) {
    id = req.query.officemlsid
    const mls = req.query.mls
    expect(id).to.be.a('string').and.to.have.length.above(4)
    expect(mls).to.be.a('string').and.to.have.length.above(0)

    const agents = await Agent.getByOfficeId(id, mls)
    return res.collection(agents)
  }

  if (req.query.q) {
    expect(req.query.q).to.be.a('string').and.to.have.length.above(2)

    if (req.query.mls)
      expect(req.query.mls).to.be.an('array')

    const agents = await Agent.search(req.query.q, req.query.mls)
    return res.collection(agents)
  }

  return res.error(Error.Validation('Malformed search query'))
}

const get = async (req, res) => {
  const agent_id = req.params.id

  expect(agent_id).to.be.uuid

  const agent = await Agent.get(agent_id)

  return res.model(agent)
}

const report = async (req, res) => {
  expect(req.body.criteria).to.be.an('object')

  const report = await Agent.report(req.body.criteria)
  res.collection(report)
}

const router = function (app) {
  const b = app.auth.bearer.middleware

  app.get('/agents/search', am(search))
  app.get('/agents/:id', b, am(get))
  app.post('/agents/report', b, am(report))
}

module.exports = router
