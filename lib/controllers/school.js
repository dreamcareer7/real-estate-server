const expect = require('../utils/validator.js').expect

const search = (req, res) => {
  const term = req.query.q

  if (term && term.length > 2) {
    School.search(term, (err, schools) => {
      if (err)
        return res.error(err)

      return res.collection(schools)
    })
    return
  }

  const districts = req.query.districts || []

  if (Array.isArray(districts) && districts.length > 0) {
    School.getByDistrict(districts, (err, schools) => {
      if (err)
        return res.error(err)

      return res.collection(schools)
    })
    return
  }

  return res.error(Error.Validation('Please specify query or districts'))
}

const searchDistricts = (req, res) => {
  const terms = req.query.q || []

  expect(terms).to.be.an('array')

  School.searchDistricts(terms, (err, districts) => {
    if (err)
      return res.error(err)

    res.collection(districts)
  })
}

const router = function (app) {
  app.get('/schools/search', search)
  app.get('/schools/districts/search', searchDistricts)
}

module.exports = router
