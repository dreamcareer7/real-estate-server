const request = require('request-promise-native')
const pdfjs = require('pdfjs-dist')
const config = require('../../../config')

const _ = require('lodash')

const Role = ({roles, assignment}) => {
  const relevant = roles
    .filter(role => {
      return assignment.role.includes(role.role)
    })

  const role = relevant[assignment.number]

  if (!role)
    return

  _.get(role, assignment.attribute)
}

const rolesSetter = ({roles, assignment}) => {
  const text = roles
    .filter(role => {
      return assignment.role.includes(role.role)
    })
    .map(role => {
      return _.get(role, assignment.attribute)
    })
    .join(', ')

  return text
}

const contextSetter = ({deal, assignment}) => {
  return Deal.getContext(deal, assignment.context)
}

const assignmentSetter = () => {}

const setters = {
  Assignment: assignmentSetter,
  Role,
  Roles: rolesSetter,
  Context: contextSetter
}


const getValue = ({deal, roles, annotation}) => {
  const has = annotation.additional && annotation.additional.calculate && annotation.additional.calculate.JS
  if (!has)
    return

  let assignment

  try {
    assignment = JSON.parse(annotation.additional.calculate.JS)
  } catch(e) {
    return
  }

  const setter = setters[assignment.type]

  if (!setter)
    throw Error.Generic(`Could not find setter for ${assignment.type}`)

  return setter({deal, roles, annotation, assignment})
}

const getPdfUrl = async task => {
  const base_form_url = `${config.forms.cdn}/${task.form}.pdf`

  if (!task.submission)
    return base_form_url

  const submission = await Form.getSubmission(task.submission)

  if (!submission.file)
    return base_form_url

  const file = await AttachedFile.get(submission.file)
  return file.url
}

const updateTask = async ({user, roles, deal, task}) => {
  const pdf = await getPdfUrl(task)

  const data = await request({
    url: pdf,
    encoding: null
  })

  const document = await pdfjs.getDocument({data})

  const values = {}

  for(let i = 1; i <= document.numPages; i++) {
    const page = await document.getPage(i)
    const annotations = await page.getAnnotations()

    for(const annotation of annotations) {
      const value = getValue({deal, roles, annotation})
      if (!value)
        continue

      values[annotation.fieldName] = String(value)
    }
  }

  return Task.setSubmission(task.id, {
    user_id: user.id,
    state: 'Fair',
    values,
    pdf
  })
}

Deal.updateTaskSubmission = async ({task, user, deal}) => {
  const roles = await DealRole.getAll(deal.roles)

  return updateTask({
    user,
    deal,
    task,
    roles
  })
}
