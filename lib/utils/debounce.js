const debounce = (trigger, delay) => {
  let timerMap   = {}

  return (key) => {
    clearTimeout(timerMap[key])

    timerMap[key] = setTimeout(() => {
      trigger(key)
    }, delay)
  }
}


module.exports = debounce