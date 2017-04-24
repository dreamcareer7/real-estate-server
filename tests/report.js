let write

module.exports = (program) => {
  write = process.stdout.write.bind(process.stdout)

  process.stdout.write = () => {}
  process.stderr.write = () => {}

  Run.on('message', (suite, message) => {
    if (message.code !== 'test done')
      return

    if (message.test.failed > 0)
      error(suite, message.test)
    else
      pass(suite, message.test)


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

function error(suite, test) {
  log(`✘ ${pad(suite, 15)} \t ${test.name}`.red)
}

function pass(suite, test) {
  log(`✓ ${pad(suite, 15)} \t ${test.name}`.green)
}

function pad(string, space) {
  while(string.length < space)
    string += ' '

  return string
}