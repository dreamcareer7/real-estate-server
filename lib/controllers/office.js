function getByMLS (req, res) {
  const mls_id = req.query.mlsid

  Office.getByMLS(mls_id, function (err, office) {
    if (err)
      return res.error(err)

    res.model(office)
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.get('/offices/search', b(getByMLS))
}

module.exports = router
