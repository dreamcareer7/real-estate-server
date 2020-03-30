const debounce = (trigger, delay, max) => {
  let counterMap = {}
  let timerMap   = {}

  return (key, promise) => {
    counterMap[key] = counterMap[key] ? ++counterMap[key] : 1
    clearTimeout(timerMap[key])

    if ( counterMap[key] >= max ) {
      trigger(key, promise)
      counterMap[key] = 0
    } else {
      timerMap[key] = setTimeout(() => {
        trigger(key, promise)
        counterMap[key] = 0
      }, delay)
    }
  }
}


module.exports = debounce