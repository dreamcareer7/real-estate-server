const search = (req, res) => {
  const term = req.query.q

  if (Array.isArray(term))
    return res.error(Error.Validation('You must supply a single search term'))

  if (term && term.length > 2) {
    School.search(term, (err, schools) => {
      if (err)
        return res.error(err)

      return res.collection(schools)
    })
  }

  const districts = req.query.districts || []

  if (Array.isArray(districts) && districts.length > 0) {
    School.getByDistrict(districts, (err, schools) => {
      if (err)
        return res.error(err)

      return res.collection(schools)
    })
  }

  return res.error(Error.Validation('Please specify query or districts'))
}

const searchDistricts = (req, res) => {
  const terms = req.query.q || []

  if (!Array.isArray(terms))
    return res.error(Error.Validation('You must supply an array of search terms'))

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
