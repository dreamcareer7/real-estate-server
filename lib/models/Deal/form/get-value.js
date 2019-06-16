const _ = require('lodash')
const moment = require('moment')
const numeral = require('numeral')

const getAttributeValue = ({role, instruction}) => {
  const { attribute, attributes = [] } = instruction

  if (attribute)
    return _.get(role, attribute, '')

  for(const attr of attributes) {
    const val = _.get(role, attr, false)
    if (val)
      return val
  }

  return ''
}

const Role = ({roles, instruction}) => {
  const relevant = roles
    .filter(role => {
      return instruction.role.includes(role.role)
    })

  const role = relevant[instruction.number]

  if (!role)
    return

  return getAttributeValue({role, instruction})
}

const rolesSetter = ({roles, instruction}) => {
  const text = roles
    .filter(role => {
      return instruction.role.includes(role.role)
    })
    .map(role => {
      return getAttributeValue({role, instruction})
    })
    .filter(r => typeof r === 'string' && r.length > 0)
    .join(', ')

  return text
}

const TEXT = 'Text'
const DATE = 'Date'
const NUMBER = 'Number'
const CURRENCY = 'Currency'

const types = {}

types[TEXT] = value => value

types[DATE] = value => {
  if (!value)
    return ''

  return moment(value).format('DD MMM, YYYY')
}

types[NUMBER] = (value, format) => {
  if (format === CURRENCY)
    return numeral(value).format('0,0')

  return value
}

const contextSetter = ({deal, instruction, definitions}) => {
  const value = Deal.getContext(deal, instruction.context)
  const definition = definitions[instruction.context]

  if (!definition) // Im not sure in what situations this could happen.
    throw new Error.Generic(`Context definition ${instruction.context} not found`)

  const { format, data_type } = definition

  if (!types[data_type])
    throw new Error.Generic(`Data type ${data_type} not found`)

  return types[data_type](value, format)
}

const assignmentSetter = () => {}

const setters = {
  Assignment: assignmentSetter,
  Role,
  Roles: rolesSetter,
  Context: contextSetter
}

const getValue = ({deal, roles, instruction, definitions}) => {
  const setter = setters[instruction.type]

  if (!setter)
    throw Error.Generic(`Could not find setter for ${instruction.type}`)

  return setter({deal, roles, instruction, definitions})
}

module.exports = getValue
