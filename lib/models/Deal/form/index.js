const request = require('request-promise-native')
const pdfjs = require('pdfjs-dist')
const config = require('../../../config')
const groupAnnotations = require('./group-annotations')
const getValues = require('./get-values')

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

  let values = {}

  for(let i = 1; i <= document.numPages; i++) {
    const page = await document.getPage(i)
    const annotations = await page.getAnnotations()

    const groups = groupAnnotations(annotations)
    const pageValues = getValues({groups, deal, roles})

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

  return updateTask({
    user,
    deal,
    task,
    roles
  })
}
