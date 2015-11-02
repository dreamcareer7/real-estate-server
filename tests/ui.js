var clui    = require('clui');

var suites = {};
var requests = [];

function logger(req, res, next) {
  var start = new Date().getTime();

  var end = res.end;
  res.end = function(data, encoding, callback) {
    requests.unshift({
      method:req.method,
      path:req.path,
      responseStatus:res.statusCode,
      elapsed: (new Date).getTime() - start
    });
    updateUI();
    end.call(res, data, encoding, callback);
  }

  next();
}

Run.on('spawn', (suite) => suites[suite].state = 'Running');

Run.on('message', (suite, message) => {
  if(message.code !== 'test done')
    return ;

  suites[suite].tests.push(message.test);
})

Run.on('suite done', (suite) => {
  suites[suite].state = 'Done';
});

Run.on('app ready', (app) => app.use(logger));

Run.on('register suite', (suite) => {
  suites[suite] = {
    state:'Pending',
    tests:[]
  }
});


['spawn', 'message', 'suite done', 'register suite'].map( (e) => Run.on(e, updateUI) );

var newline = () => new clui.Line(' ').fill();
function updateUI() {
  var screen = new clui.LineBuffer({
    x:0,
    y:0,
    width:'console',
    height:'console'
  });

  screen.addLine(newline());
  
  Object.keys(suites).forEach( (suite) => {
    var result = suites[suite];

    var line = new clui.Line(screen);

    var icons = {
      'Pending'  : '○',
      'Running'  : '◌',
      'Done'     : '●'
    }

    line.column( icons[result.state].green, 10);

    line.column( ('Suite: '+suite).green, 40);

    if(result.state === 'Pending') {
      line.column('Pending'.yellow)
    } else {
      var s = '';

      result.tests.forEach( (test) => {
        if(test.failed > 0)
          s += '■'.red;
        else
          s += '■'.green;
      });

      line.column(s, 40);
    }
    line.fill();
    line.store();


    if(!result) return ;
    result.tests.forEach( (test) => {
      if(test.failed < 1)
        return ;

      var line = new clui.Line(screen);
      line.padding(15).column(test.name.red, 600);
      line.fill().store();

      test.messages.forEach( (message) => {
        var line = new clui.Line(screen);
        line.padding(20).column(message.red, 600);
        line.fill().store();
      })
    });
  })

  screen.addLine(newline());

  requests.map( (req) => {
    var line = new clui.Line(screen);

    if(req.responseStatus > 499)
      var statusColor = 'red';
    else
      var statusColor = 'green';

    if(req.elapsed < 200) {
      var elapsedColor = 'green';
    } else if(req.elapsed < 1000) {
      var elapsedColor = 'yellow';
    } else {
      var elapsedColor = 'red';
    }

    line.column((req.elapsed.toString()+'ms')[elapsedColor], 8);
    line.column(req.responseStatus.toString()[statusColor], 5);
    line.column(req.method.toUpperCase()[statusColor], 8);
    line.column(req.path[statusColor]);
    line.fill().store();
  });

  process.stdout.write('\033[9A');
  screen.fill(newline());
  screen.output();
}