const getContextKey = instruction => {
  const { context, group } = instruction

  return `${group}_${context}`
}

const getRoleKey = instruction => {
  const {
    attribute,
    attributes = [ attribute ],
    role,
    group
  } = instruction

  return `${group}_${role.sort().concat(attributes.sort()).join('_')}`
}

const getRolesKey = instruction => {
  const {
    attribute,
    attributes = [ attribute ],
    role,
    group
  } = instruction

  return `${group}_${role.sort().concat(attributes.sort()).join('_')}`
}

module.exports = instruction => {
  const { type } = instruction

  if (type === 'Context')
    return getContextKey(instruction)

  if (type === 'Role')
    return getRoleKey(instruction)

  if (type === 'Roles')
    return getRolesKey(instruction)

  throw Error.Generic(`Unknown instruction type ${type}`)
}
