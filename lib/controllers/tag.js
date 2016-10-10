function getAll (req, res) {
  Tag.getAll((err, tags) => {
    if (err)
      return res.error(err)

    return res.collection(tags)
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.get('/tags', b(getAll))
}

module.exports = router
