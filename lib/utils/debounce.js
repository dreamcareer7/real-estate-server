const timerMap = {}

const debounce = (trigger, interval) => {
  return (key, payload = null) => {
    clearTimeout(timerMap[key])

    timerMap[key] = setTimeout(() => {
      trigger(key, payload)
    }, interval)
  }
}


module.exports = debounce