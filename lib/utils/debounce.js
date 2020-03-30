const debounce = (trigger, delay) => {
  const timerMap = {}

  return (key) => {
    clearTimeout(timerMap[key])

    timerMap[key] = setTimeout(() => {
      trigger(key)
    }, delay)
  }
}


module.exports = debounce