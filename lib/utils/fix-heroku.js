const fixHeroku = (req, charToSend = '\n') => {
  const res = req.res
  const write = () => {
    Context.log('[HerokuFix] heartbeat')
    res.write(charToSend)
    res.flush() // For GZIP
  }

  const interval = setInterval(write, 15000)
  Context.log('[HerokuFix] started')

  res.json = json => {
    clearInterval(interval)
    Context.log('[HerokuFix] done')

    res.write(JSON.stringify(json))
    res.end()
  }
  return function () {
    clearInterval(interval)
    Context.log('[HerokuFix] called off')
  }
}

module.exports = fixHeroku