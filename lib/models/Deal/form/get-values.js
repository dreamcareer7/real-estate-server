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
  const annotations = items.map(i => i.annotation)

  return wordWrap(annotations, value)
}

const getValues = ({deal, roles, groups, definitions}) => {
  let values = {}

  for(const group of groups) {
    const groupValues = getGroupValues({deal, roles, group, definitions})

    values = {
      ...values,
      ...groupValues
    }
  }

  return values
}

module.exports = getValues
