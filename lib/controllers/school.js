const search = (req, res) => {
  const term = req.query.q
  if (term && term.length > 2) {
    School.search(term, (err, schools) => {
      if (err)
        return res.error(err)

      res.collection(schools)
    })
    return
  }

  const districts = req.query.district ? [req.query.district] : req.query.districts

  if (Array.isArray(districts) && districts.length > 0) {
    School.getByDistrict(districts, (err, schools) => {
      if (err)
        return res.error(err)

      res.collection(schools)
    })

    return
  }

  res.error(Error.Validation('Please specify query or districts'))
}

const searchDistricts = (req, res) => {
  const terms = req.query.q || []

  School.searchDistricts(terms, (err, districts) => {
    if (err)
      return res.error(err)

    res.collection(districts)
  })
}

const router = function (app) {
  app.get('/schools/search', app.auth.optionalBearer(search))
  app.get('/schools/districts/search', app.auth.optionalBearer(searchDistricts))
}

module.exports = router
