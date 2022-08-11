const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware.js')
const Office = require('../models/Office/get')

const search = async (req, res) => {
  if (req.query.mlsid) {
    const mls_id = req.query.mlsid

    expect(mls_id).to.be.a('string')

    const office = await Office.getByMLS(mls_id, req.query.mls)

    res.model(office)

    return
  }

  if (req.query.q) {
    expect(req.query.q).to.be.a('string').and.have.length.above(2)

    const offices = await Office.search(req.query.q, req.query.mls)
    res.collection(offices)

    return
  }

  return res.error(Error.Validation('Malformed search query'))
}

const router = function (app) {
  const b = app.auth.bearer.middleware

  app.get('/offices/search', b, am(search))
}

module.exports = router
