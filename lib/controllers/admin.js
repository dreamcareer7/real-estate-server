function ping (req, res) {
  res.status(200)
  return res.end('pong')
}

function asyncFail (req, res) {
  setTimeout(() => {
    throw new Error('foo')
  })

  setTimeout(() => {
    throw new Error('foo')
  })

  setTimeout(() => {
    res.send('bar')
  })
}

const router = function (app) {
  app.get('/admin/ping', ping)
  app.get('/admin/async_fail', asyncFail)
}

module.exports = router
