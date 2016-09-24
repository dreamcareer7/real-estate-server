const clui    = require('clui')
const bytes = require('bytes')

const suites = {}
const requests = []

Error.autoReport = false

function logger(req, res, next) {
  const start = new Date().getTime()

  const end = res.end
  res.end = function(data, encoding, callback) {
    requests.unshift({
      method:         req.method,
      path:           req.path,
      responseStatus: res.statusCode,
      elapsed:        (new Date).getTime() - start,
      length:         data ? data.length : null
    })
    updateUI()
    end.call(res, data, encoding, callback)
  }

  next()
}

Run.on('spawn', (suite) => suites[suite].state = 'Running')

Run.on('message', (suite, message) => {
  if(message.code !== 'test done')
    return 

  suites[suite].tests.push(message.test)
})

Run.on('suite done', (suite) => {
  suites[suite].state = 'Done'
})

Run.on('app ready', (app) => app.use(logger))

Run.on('register suite', (suite) => {
  suites[suite] = {
    state: 'Pending',
    tests: []
  }
});


['spawn', 'message', 'suite done', 'register suite'].map( (e) => Run.on(e, updateUI) )

const newline = () => new clui.Line(' ').fill()
function updateUI() {
  const screen = new clui.LineBuffer({
    x:      0,
    y:      0,
    width:  'console',
    height: 'console'
  })

  screen.addLine(newline())

  Object.keys(suites).forEach( (suite) => {
    const result = suites[suite]

    const line = new clui.Line(screen)

    const icons = {
      'Pending': '○',
      'Running': '◌',
      'Done':    '●'
    }

    line.column( icons[result.state].green, 10)

    line.column( ('Suite: '+suite).green, 40)

    if(result.state === 'Pending') {
      line.column('Pending'.yellow)
    } else {
      let s = ''

      result.tests.forEach( (test) => {
        if(test.failed > 0)
          s += '■'.red
        else
          s += '■'.green
      })

      line.column(s, 40)
    }
    line.fill()
    line.store()


    if(!result) return 
    result.tests.forEach( (test) => {
      if(test.failed < 1)
        return 

      const line = new clui.Line(screen)
      line.padding(15).column(test.name.red, 600)
      line.fill().store()

      test.messages
      .filter( message => message !== 'Passed.' )
      .forEach( (message) => {
        const line = new clui.Line(screen)
        line.padding(20).column(message.red, 600)
        line.fill().store()
      })
    })
  })

  screen.addLine(newline())

  requests.map( (req) => {
    const line = new clui.Line(screen)

    let statusColor, elapsedColor, lengthColor

    if(req.responseStatus > 499)
      statusColor = 'red'
    else
      statusColor = 'green'

    if(req.elapsed < 200) {
      elapsedColor = 'green'
    } else if(req.elapsed < 1000) {
      elapsedColor = 'yellow'
    } else {
      elapsedColor = 'red'
    }

    if(!req.length || req.length < 50000) {
      lengthColor = 'green'
    } else if(req.length < 100000) {
      lengthColor = 'yellow'
    } else {
      lengthColor = 'red'
    }

    let length = req.length
    if(length)
      length = bytes(length, {decimalPlaces: 0})[lengthColor]
    else
      length = ''

    line.column((req.elapsed.toString()+'ms')[elapsedColor], 8)
    line.column(length, 6)
    line.column(req.responseStatus.toString()[statusColor], 5)
    line.column(req.method.toUpperCase()[statusColor], 8)
    line.column(req.path[statusColor])
    line.fill().store()
  })

  process.stdout.write('\033[9A')
  screen.fill(newline())
  screen.output()
}

module.exports = (program) => {
  if(!program.keep)
    Run.on('done', process.exit)
}