const getInstruction = require('./get-instruction')
const getKey = require('./get-key')

const groupAnnotations = annotations => {
  const groups = {}

  for(const annotation of annotations) {
    const instruction = getInstruction(annotation)

    console.log(instruction)
    if (!instruction)
      continue

    const { group } = instruction

    /*
     * Has no group.
     * Means its a group with a single item.
     */
    if (!group) {
      groups[Symbol()] = [annotation]
      continue
    }

    const key = getKey(instruction)

    console.log('KEY', key)

    if (groups[key]) {
      groups[key].push(annotation)
      continue
    }

    groups[key] = [annotation]
  }


  /* Object.values() does not return
   * items which have Symbol() as a key.
   * This is a replacement method.
   */

  return Object
    .getOwnPropertySymbols(groups)
    .map(symbol => groups[symbol])
    .concat(Object.values(groups))
}

module.exports = groupAnnotations
