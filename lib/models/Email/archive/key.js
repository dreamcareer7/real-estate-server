/**
 * @param {string} name
 */
function getKey(name) {
  return `emails/${name[0]}/${name.slice(0, 4)}/${name}`
}

module.exports = getKey
