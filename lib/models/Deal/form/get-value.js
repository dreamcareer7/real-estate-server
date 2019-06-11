const _ = require('lodash')

const Role = ({roles, instruction}) => {
  const relevant = roles
    .filter(role => {
      return instruction.role.includes(role.role)
    })

  const role = relevant[instruction.number]

  if (!role)
    return

  _.get(role, instruction.attribute)
}

const rolesSetter = ({roles, instruction}) => {
  const text = roles
    .filter(role => {
      return instruction.role.includes(role.role)
    })
    .map(role => {
      return _.get(role, instruction.attribute)
    })
    .filter(r => typeof r === 'string' && r.length > 0)
    .join(', ')

  return text
}

const contextSetter = ({deal, instruction}) => {
  return Deal.getContext(deal, instruction.context)
}

const assignmentSetter = () => {}

const setters = {
  Assignment: assignmentSetter,
  Role,
  Roles: rolesSetter,
  Context: contextSetter
}

const getValue = ({deal, roles, instruction}) => {


  const setter = setters[instruction.type]

  if (!setter)
    throw Error.Generic(`Could not find setter for ${instruction.type}`)

  return setter({deal, roles, instruction})
}

module.exports = getValue
