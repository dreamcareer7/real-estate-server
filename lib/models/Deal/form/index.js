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
  if (task.file) {
    const file = await AttachedFile.get(task.file)
    if (file.url)
      return file.url
  }

  return `${config.forms.cdn}/${task.form}.pdf`
}

const updateTask = async ({user, roles, deal, task}) => {
  const submission = await Form.getSubmission(task.submission)
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

Deal.updateTaskForm = async ({task, user, deal})  => {

}

Deal.updateForms = async ({user, deal}) => {
  const checklists = await DealChecklist.getAll(deal.checklists)

  const task_ids = _.chain(checklists).map('tasks').concat().flatten().value()
  const tasks = await Task.getAll(task_ids)
  const has_form = tasks.filter(task => task.form)

  const roles = await DealRole.getAll(deal.roles)

  const promises = has_form.map(task => {
    return updateTask({
      user,
      roles,
      deal,
      task
    })
  })

  await Promise.all(promises)
}
