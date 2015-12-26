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
  var main = []
  var x1 = x0 - Math.abs(xp);
  var y1 = y0 + Math.abs(y);
  var p1={'longitude': x1, 'latitude': y1};
  main.push(p1);

  var x2 = x0 + Math.abs(xp);
  var y2 = y0 + Math.abs(y);
  var p2={'longitude': x2, 'latitude': y2};
  main.push(p2);


  var x3 = x0 + Math.abs(xp);
  var y3 = y0 - Math.abs(y);
  var p3={'longitude': x3, 'latitude': y3};
  main.push(p3);


  var x4 = x0 - Math.abs(xp);
  var y4 = y0 - Math.abs(y);
  var p4={'longitude': x4, 'latitude': y4};
  main.push(p4);

  points.push(main)

  //generate new points with small margin
  var near = []
  var nx1 = x1 - (0.1 / 6378) * (180 / Math.PI) / Math.cos(y1 * Math.PI/180);
  var ny1 = y1  + (0.1 / 6378) * (180 / Math.PI);
  var np1={'longitude': nx1, 'latitude': ny1};
  near.push(np1);

  var nx2 = x2 + (0.1 / 6378) * (180 / Math.PI) / Math.cos(y2 * Math.PI/180);
  var ny2 = y2  + (0.1 / 6378) * (180 / Math.PI);
  var np2={'longitude': nx2, 'latitude': ny2};
  near.push(np2);

  var nx3 = x3 + (0.1 / 6378) * (180 / Math.PI) / Math.cos(y3 * Math.PI/180);
  var ny3 = y3  - (0.1 / 6378) * (180 / Math.PI);
  var np3={'longitude': nx3, 'latitude': ny3};
  near.push(np3);

  var nx4 = x4 + (0.1 / 6378) * (180 / Math.PI) / Math.cos(y4 * Math.PI/180);
  var ny4 = y4  - (0.1 / 6378) * (180 / Math.PI);
  var np4={'longitude': nx4, 'latitude': ny4};
  near.push(np4);

  points.push(main);
  points.push(near);
  return points;

}

