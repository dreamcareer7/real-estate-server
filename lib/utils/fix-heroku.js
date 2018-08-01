const debug = require('debug')('rechat:herokufix')

const fixHeroku = (req, charToSend = '\n') => {
  const res = req.res
  const write = () => {
    debug('Sending a byte...')
    res.write(charToSend)
    res.flush() // For GZIP
  }

  const interval = setInterval(write, 15000)
  debug('Starting heroku fix...')

  res.json = json => {
    clearInterval(interval)
    debug('Heroku fix cleared...')

    res.write(JSON.stringify(json))
    res.end()
  }
  return function () {
    clearInterval(interval)
    debug('Heroku fix cleared...')
  }
}

module.exports = fixHeroku