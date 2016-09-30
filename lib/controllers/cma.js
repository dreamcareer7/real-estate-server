function createCMA (req, res) {
  const room_id = req.params.id
  const cma = req.body

  cma.user = req.user.id
  cma.room = room_id

  CMA.create(cma, (err, cma) => {
    if (err)
      return res.error(err)

    return res.model(cma)
  })
}

function getCMAsForRoom (req, res) {
  const room_id = req.params.id

  CMA.getForRoom(room_id, (err, cmas) => {
    if (err)
      return res.error(err)

    return res.collection(cmas)
  })
}

function deleteCMA (req, res) {
  const cma_id = req.params.id

  CMA.delete(cma_id, (err) => {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function getListingsForCMA (req, res) {
  const cma_id = req.params.id

  CMA.getListings(cma_id, function (err, listings) {
    if (err)
      return res.error(err)

    return res.collection(listings)
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.get('/rooms/:room/cmas/:id/listings', b(getListingsForCMA))
  app.post('/rooms/:id/cmas', b(createCMA))
  app.get('/rooms/:id/cmas', b(getCMAsForRoom))
  app.delete('/rooms/:rid/cmas/:id', b(deleteCMA))
}

module.exports = router
