const Orm = require('../Orm/registry')

const { getAll } = require('./get')

const obfuscatePhone = string => {
  let obfuscated = string.replace(/\d/g, 'X')
  obfuscated = obfuscated.slice(0, obfuscated.length - 2) + string.slice(-2) // Last two digits always visible

  const parenthesis = string.match(/^(\s){0,}\((\d){1,}\)/)
  if (!parenthesis) {
    return string.slice(0, 2) + obfuscated.slice(2)
  }

  return parenthesis[0] + obfuscated.slice(parenthesis[0].length)
}

const obfuscateEmail = string => {
  const start = parseInt(string.length / 4)
  const end = parseInt(string.length - start)

  return (
    string.substring(0, start) +
    Array(end - start + 1).join('x') +
    string.substring(end, string.length)
  )
}

const publicize = model => {
  /*
   * agent.phone_number is provided by mls.
   * many times it's null as it's optional.
   *
   * However, we found that we can find agent phone numbers oh their listings.
   * That's why we have the whole agent_phones and agent_emails tables
   * and continously refresh them.
   *
   * Since we want the clients to show phone numbers of agents
   * and prevent issues like ios#500
   * during publicize, we will try to give them a valid phone number
   * if the one provided by mls is null.
   *
   * We wont due that internall though.
   * We want logic to be simple and data to be integral internally.
   */

  delete model.matrix_modified_dt

  let questions = []

  if (model.phone_numbers) {
    const valid_phones = model.phone_numbers.filter(Boolean)

    if (!model.phone_number && valid_phones.length)
      model.phone_number = valid_phones[0]

    questions = questions.concat(model.phone_numbers.map(obfuscatePhone))
    delete model.phone_numbers
  }

  if (model.emails) {
    const valid_emails = model.emails.filter(Boolean)

    if (!model.email && valid_emails.length)
      model.email = valid_emails[0]

    questions = questions.concat(model.emails.map(obfuscateEmail))
    delete model.emails
  }

  model.secret_questions = questions

  return model
}

const associations = {
  office: {
    id: (a, cb) => cb(null, a.office_id),
    enabled: false,
    optional: true,
    model: 'Office'
  }
}

Orm.register('agent', 'Agent', {
  getAll,
  publicize,
  associations
})
