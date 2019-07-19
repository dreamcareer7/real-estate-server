const request = require('request-promise-native')
const pdfjs = require('pdfjs-dist')
const groupAnnotations = require('./group-annotations')
const getValues = require('./get-values')
const getPdfUrl = require('./get-pdf-url')
const setDynamicRoles = require('./set-dynamic-roles')
const _ = require('lodash')

const updateTask = async ({user, roles, deal, task, definitions}) => {
  const pdf = await getPdfUrl(task)

  const data = await request({
    url: pdf,
    encoding: null
  })

  setDynamicRoles({deal, roles})

  const document = await pdfjs.getDocument({data})

  let values = {}

  for(let i = 1; i <= document.numPages; i++) {
    const page = await document.getPage(i)
    const annotations = await page.getAnnotations()

    const groups = groupAnnotations(annotations)
    const pageValues = getValues({groups, deal, roles, definitions})

    values = {
      ...values,
      ...pageValues
    }
  }

  return Task.setSubmission(task.id, {
    user_id: user.id,
    state: 'Fair',
    values,
    pdf
  }, false)
}

Deal.updateTaskSubmission = async ({task, user, deal}) => {
  const roles = await DealRole.getAll(deal.roles)

  const populated = await Orm.populate({
    models: roles,
    associations: [
      'agent.office',
      'deal_role.agent',
      'deal_role.user',
    ]
  })

  const definitions = await BrandContext.getByBrand(deal.brand)
  const indexed = _.keyBy(definitions, 'key')

  return updateTask({
    user,
    deal,
    task,
    definitions: indexed,
    roles: populated
  })
}
