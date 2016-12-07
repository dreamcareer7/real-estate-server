function getByMLS (req, res) {
  if (req.query.mlsid) {
    const mls_id = req.query.mlsid

    Office.getByMLS(mls_id, function (err, office) {
      if (err)
        return res.error(err)

      res.model(office)
    })
  } else if (req.query.q) {
    Office.search(req.query.q, (err, offices) => {
      if (err)
        res.error(err)

      res.collection(offices)
    })
  } else {
    return res.error(Error.Validation('Malformed search query'))
  }
}

const router = function (app) {
  const b = app.auth.bearer

  app.get('/offices/search', b(getByMLS))
}

module.exports = router
