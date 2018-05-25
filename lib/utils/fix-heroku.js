const fixHeroku = (req, charToSend = '\n') => {
  const res = req.res
  const write = () => {
    res.write(charToSend)
    res.flush() // For GZIP
  }
  
  const interval = setInterval(write, 15000)
  
  res.json = json => {
    clearInterval(interval)
    
    res.write(JSON.stringify(json))
    res.end()
  }
  return function () {
    clearInterval(interval)
  }
}

module.exports = fixHeroku