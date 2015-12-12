Client.searchByLocation = function (criteria, cb) {
  var timeoutReached = false;
  var timeout = setTimeout(function () {
    timeoutReached = true;
    cb('Timeout on RETS client reached');
  }, config.ntreis.timeout);

  client.once('connection.success', function () {
    if (timeoutReached)
      return console.log('We got a response, but it was way too late. We already consider it a timeout.');

    client.getTable("Property", "Listing");
    var fields;

    var query = ('(MatrixModifiedDT=' + criteria.from + '+),' +
      '( Longitude=' + criteria.points[0].longitude + '+),(Latitude=' + criteria.points[0].latitude + '-),' +
      '( Longitude=' + criteria.points[1].longitude + '-),(Latitude=' + criteria.points[2].latitude + '+),' +
      '  (STATUS=A,AC,AOC,AKO), (OriginalListPrice=' + criteria.minimum_price + '+)'
    )

    Client.emit('starting query', query);
    client.once('metadata.table.success', function (table) {
      if (timeoutReached)
        return console.log('We got a response, but it was way too late. We already consider it a timeout.');

      fields = table.Fields;
      client.query("Property",
        "Listing",
        query,
        function (err, data) {
          if (timeoutReached)
            return console.log('We got a response, but it was way too late. We already consider it a timeout.');

          clearTimeout(timeout);

          if (err)
            return cb(err);
          data.sort((Client.options.initial) ? byMatrix_Unique_ID : byMatrixModifiedDT);

          return cb(null, data);
        });
    });
  });
}