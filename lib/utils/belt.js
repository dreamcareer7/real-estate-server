function indexBy(arr, idx) {
  return arr.reduce((index, obj) => {
    index[obj[idx]] = obj
    return index
  }, {})
}

function pick(obj, props) {
  return props.reduce((o, prop) => {
    if (obj.hasOwnProperty(prop))
      o[prop] = obj[prop]

    return o
  }, {})
}

module.exports = {
  indexBy,
  pick
}
