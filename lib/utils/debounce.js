const debounce = (trigger, interval) => {
  const timerMap = {}

  return (key, payload = null) => {
    clearTimeout(timerMap[key])

    timerMap[key] = setTimeout(() => {
      trigger(key, payload)
    }, interval)
  }
}


module.exports = debounce