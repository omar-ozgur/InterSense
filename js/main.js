function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 34.06908, lng: -118.444496 },
    zoom: 12,
    styles: mapStyle
  });

  map.data.setStyle(styleFeature);

  // Get the earthquake data (JSONP format)
  // This feed is a copy from the USGS feed, you can find the originals here:
  //   http://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
var values = "\
34.0690 -118.4444 5 \
34.1 -118 4 \
34.08 -118.5 4.5 \
34.075 -118.35 5.2 \
34.09 -118.45 8 \
";

  var splitValues = values.split(" ");
  var jsonTxt = {"type":"FeatureCollection","features":[]};

  for (var i = 0; i < splitValues.length - 1; i+=3){
    jsonTxt["features"].push({"type":"Feature","properties":{"mag":parseFloat(splitValues[i+2])},"geometry":{"type":"Point","coordinates":[parseFloat(splitValues[i+1]),parseFloat(splitValues[i]),0]}})
  }
  console.log(jsonTxt);

  var txt = eqfeed_callback(jsonTxt);

  var script = document.createElement('script');
  script.setAttribute('src', txt);
}

// Defines the callback function referenced in the jsonp file.
function eqfeed_callback(data) {
  map.data.addGeoJson(data);
}

function styleFeature(feature) {
  var low = [151, 83, 34];   // color of mag 1.0
  var high = [5, 69, 54];  // color of mag 6.0 and above
  var minMag = 1.0;
  var maxMag = 6.0;

  // fraction represents where the value sits between the min and max
  var fraction = (Math.min(feature.getProperty('mag'), maxMag) - minMag) /
      (maxMag - minMag);

  var color = interpolateHsl(low, high, fraction);

  return {
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      strokeWeight: 0.5,
      strokeColor: '#fff',
      fillColor: color,
      fillOpacity: 2 / feature.getProperty('mag'),
      // while an exponent would technically be correct, quadratic looks nicer
      scale: 50
    },
    zIndex: Math.floor(feature.getProperty('mag'))
  };
}

function interpolateHsl(lowHsl, highHsl, fraction) {
  var color = [];
  for (var i = 0; i < 3; i++) {
    // Calculate color based on the fraction.
    color[i] = (highHsl[i] - lowHsl[i]) * fraction + lowHsl[i];
  }

  return 'hsl(' + color[0] + ',' + color[1] + '%,' + color[2] + '%)';
}

var mapStyle = [{
  'featureType': 'all',
  'elementType': 'all',
  'stylers': [{'visibility': 'on'}]
}];