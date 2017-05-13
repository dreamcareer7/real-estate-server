let write

module.exports = (program) => {
  write = process.stdout.write.bind(process.stdout)

  process.stdout.write = () => {}
  process.stderr.write = () => {}

  Run.on('message', (suite, message) => {
    if (message.code !== 'test done')
      return

    if (message.test.failed > 0)
      error(suite, message)
    else
      pass(suite, message)


    if (message.test.failed > 0 && program.stopOnFail)
      process.exit(3)
  })

  if (!program.keep)
    Run.on('done', process.exit)
}

function log() {
  const args = Array.prototype.slice.call(arguments)

  write(args.join(' ') + '\n')
}

function error(suite, message) {
  log(`✘ ${pad(suite, 15)} \t ${message.test.name}`.red)
  message.test.messages.forEach(message => {
    log(`\t${message.message}`.yellow)
    if (message.expected)
      log(`\t\tExpected: ${JSON.stringify(message.expected)}`)
    if (message.actual)
      log(`\t\tActual:   ${JSON.stringify(message.actual)}`)
  })
}

function pass(suite, message) {
  log(`✓ ${pad(suite, 15)} \t ${message.test.name}`.green)
}

function pad(string, space) {
  while(string.length < space)
    string += ' '

  return string
}