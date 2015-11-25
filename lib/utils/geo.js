exports.generateRandomPoints = function(center, radius) {
  var x0 = center.lng;
  var y0 = center.lat;
  // Convert Radius from meters to degrees.
  var rd = radius / 111300;

  var u = Math.random();
  var v = Math.random();

  var w = rd * Math.sqrt(u);
  var t = 2 * Math.PI * v;
  var x = w * Math.cos(t);
  var y = w * Math.sin(t);

  var xp = x / Math.cos(y0);

  // Resulting point.
  var points = [];
  var x1 = x0 - Math.abs(xp);
  var y1 = y0 + Math.abs(y);
  var p1={'longitude': x1, 'latitude': y1};
  points.push(p1);

  var x2 = x0 + Math.abs(xp);
  var y2 = y0 + Math.abs(y);
  var p2={'longitude': x2, 'latitude': y2};
  points.push(p2);


  var x3 = x0 + Math.abs(xp);
  var y3 = y0 - Math.abs(y);
  var p3={'longitude': x3, 'latitude': y3};
  points.push(p3);


  var x4 = x0 - Math.abs(xp);
  var y4 = y0 - Math.abs(y);
  var p4={'longitude': x4, 'latitude': y4};
  points.push(p4);

  return points;

}

