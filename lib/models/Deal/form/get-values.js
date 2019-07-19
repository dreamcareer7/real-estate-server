const getInstruction = require('./get-instruction')
const getValue = require('./get-value')
const wordWrap = require('./word-wrap')

const getGroupValues = ({deal, roles, group, definitions}) => {
  const items = group
    .map(annotation => {
      const instruction = getInstruction(annotation)

      return {
        annotation,
        instruction
      }
    })
    .sort((a, b) => {
      return a.instruction.order - b.instruction.order
    })

  const { instruction } = items[0]

  const value = getValue({deal, roles, instruction, definitions})

  // If getValue returns false, that means the value
  // For that field should be left unchanged.
  // Example usecase is instructions with disableAutopopulate feature
  if (value === false)
    return false

  const annotations = items.map(i => i.annotation)

  return wordWrap(annotations, value)
}

const getValues = ({deal, roles, groups, definitions}) => {
  let values = {}

  for(const group of groups) {
    const groupValues = getGroupValues({deal, roles, group, definitions})

    if (groupValues === false)
      continue

    values = {
      ...values,
      ...groupValues
    }
  }

  return values
}

module.exports = getValues
