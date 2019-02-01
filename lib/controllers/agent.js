const expect = require('../utils/validator').expect
const am = require('../utils/async_middleware.js')

const search = async (req, res) => {
  let id

  if (req.query.mlsid) {
    id = req.query.mlsid
    id = ObjectUtil.trimLeadingZeros(id)

    const agent = await Agent.getByMLSID(id)
    return res.model(agent)
  }

  if (req.query.officemlsid) {
    id = req.query.officemlsid

    expect(id).to.be.a('string').and.to.have.length.above(4)

    const agents = await Agent.getByOfficeId(id)
    return res.collection(agents)
  }

  if (req.query.q) {
    expect(req.query.q).to.be.a('string').and.to.have.length.above(2)

    const agents = await Agent.search(req.query.q)
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

  app.get('/agents/search', search)
  app.get('/agents/:id', b, am(get))
  app.post('/agents/report', b, am(report))
}

module.exports = router
