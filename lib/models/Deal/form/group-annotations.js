const getInstruction = require('./get-instruction')
const getKey = require('./get-key')

const groupAnnotations = annotations => {
  const groups = {}

  for(const annotation of annotations) {
    const instruction = getInstruction(annotation)

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

    if (groups[key]) {
      groups[key].push(annotation)
      continue
    }

    groups[key] = [annotation]
  }

  return Object.values(groups)
}

module.exports = groupAnnotations
