const fixHeroku = req => {
  const res = req.res
  res.setHeader('Content-Type', 'application/json')
  const write = () => {
    res.write('\n')
    res.flush() // For GZIP
  }
  
  const interval = setInterval(write, 1000)
  
  res.json = json => {
    clearInterval(interval)
    
    res.write(JSON.stringify(json))
    res.end()
  }
}

module.exports = fixHeroku