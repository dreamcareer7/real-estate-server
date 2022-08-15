const Context = require('../Context')

const setPublicFields = ({ select, omit }) => {
  Context.set({
    'Orm.Select': select,
    'Orm.Omit': omit,
  })
}

const getPublicFields = () => {
  return {
    select: Context.get('Orm.Select') || [],
    omit: Context.get('Orm.Omit') || [],
  }
}

const getEnabledAssociations = () => {
  return Context.get('Orm.Enabled-Associations') ?? []
}

const setEnabledAssociations = (enabled) => {
  Context.set({
    'Orm.Enabled-Associations': enabled,
  })
}

const enableAssociation = (association) => {
  const current = getEnabledAssociations()

  if (!current.includes(association)) {
    setEnabledAssociations(current.concat(association))
  }
}

const getAssociationConditions = (association) => {
  const conditions = Context.get('Orm.Associations-Conditions') || {}

  if (association) {
    return conditions[association]
  }

  return conditions
}

const setAssociationConditions = (conditions) => {
  Context.set({
    'Orm.Associations-Conditions':
      typeof conditions === 'string' ? JSON.parse(conditions) : conditions,
  })
}

module.exports = {
  setPublicFields,
  getPublicFields,
  getEnabledAssociations,
  setEnabledAssociations,
  enableAssociation,
  getAssociationConditions,
  setAssociationConditions,
}
