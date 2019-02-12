const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware.js')

const search = async (req, res) => {
  if (req.query.mlsid) {
    const mls_id = req.query.mlsid

    expect(mls_id).to.be.mlsid

    const office = await Office.getByMLS(mls_id)

    res.model(office)

    return
  }

  if (req.query.q) {
    expect(req.query.q).to.be.a('string').and.have.length.above(2)

    const offices = await Office.search(req.query.q)
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
