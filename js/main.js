var directionsDisplay;
var directionsService;
var map;
var mapStyle = [{
  'featureType': 'all',
  'elementType': 'all',
  'stylers': [{'visibility': 'on'}]
}];
var temp_data = "\
34.0683211316 -118.445910227 9.14051345523 \
34.0759915592 -118.450361188 2.93934409895 \
34.0653623779 -118.448900752 9.22463186889 \
34.072378454 -118.448637904 7.68868260837 \
34.0679052241 -118.438678421 2.1695753645 \
34.0712770589 -118.439535469 8.5610555296 \
34.0654851461 -118.449601988 4.56254127257 \
34.0656643136 -118.442312391 2.72139735736 \
34.0653214093 -118.452726124 5.41830764101 \
34.0692302338 -118.436745153 9.06534695275 \
34.0725328763 -118.446125607 9.99243984044 \
34.0677111212 -118.435454564 2.12382194754 \
34.0750854545 -118.448201704 8.68655906959 \
34.0674640382 -118.448811256 5.88654858457 \
34.0750767182 -118.443896439 8.29430190829 \
34.0770022162 -118.44704046 1.50436525089 \
34.0701902515 -118.445281618 4.26397428126 \
34.0736675629 -118.447806251 2.31409857899 \
34.0729085375 -118.449097871 7.94019189844 \
34.0684813072 -118.435499377 7.43761477116 \
34.0692692135 -118.450221235 2.68054656009 \
34.0706177492 -118.44415063 3.6373884118 \
34.0690775465 -118.452687561 6.85682495051 \
34.0656573416 -118.447344057 6.39810420365 \
34.0773626296 -118.442191146 1.65180908345 \
34.0741191417 -118.435685289 5.37688185188 \
34.0732219926 -118.443953487 2.69261523149 \
34.074468182 -118.439162925 3.15392180403 \
34.0695571472 -118.445540003 1.84847577732 \
34.070494959 -118.450741378 3.97166256401 \
34.0757526274 -118.439275787 5.5350621567 \
34.0746052984 -118.443540598 7.30740387306 \
34.0743885154 -118.454082486 3.22338558018 \
34.0699564768 -118.438122847 3.0030436592 \
34.0706978256 -118.453616285 4.12668408143 \
34.0654302227 -118.441755061 2.58636126963 \
34.0689144799 -118.45256569 2.43459395672 \
34.0726858865 -118.449624374 3.90129992071 \
34.0740121394 -118.446770529 3.9315483536 \
34.0656412523 -118.440732478 7.71962311194 \
34.0724907149 -118.437167145 4.3371638154 \
34.069664007 -118.439114835 5.98666164918 \
34.0672738832 -118.441011276 3.06784621118 \
34.0753511877 -118.43867467 2.11847711995 \
34.0724574642 -118.436779093 4.13913608132 \
34.0716854474 -118.45020548 6.09956969834 \
34.0656729828 -118.435701163 1.23287764605 \
34.0749956796 -118.443699495 8.60156779982 \
34.0723479687 -118.444495468 7.96735586982 \
34.068687027 -118.437932268 5.23663911023 \
";
var sensor_Info = [
];

var HeatMapData = [];

function initMap() {
  var split_values = temp_data.split(" ");
  for (var i = 0 ; i<split_values.length - 1; i+=3){
    var lat = split_values[i];
    var lng = split_values[i+1];
    var mag = Number(split_values[i+2]);
    var sensor_data = {
      lat: lat,
      lng: lng,
      mag: mag
    }
    sensor_Info.push(sensor_data);
  };
  console.log(sensor_Info);
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 34.069858, lng: -118.445205 },
    zoom: 16,
    styles: mapStyle
  });

  directionsService = new google.maps.DirectionsService();
  directionsDisplay = new google.maps.DirectionsRenderer();

  for (var i = 0; i<sensor_Info.length; i++){
    var location = new google.maps.LatLng(sensor_Info[i].lat, sensor_Info[i].lng);
    var weight = sensor_Info[i].mag;
    HeatMapData.push({
      location: location,
      weight: weight
    });
  }
  //console.log(HeatMapData);

  var heatmap = new google.maps.visualization.HeatmapLayer({
    data: HeatMapData,
    radius: 30
  });
  heatmap.setMap(map);
  
  var channelsAPI = "https://thingspeak.com/channels/79178/feeds?api_key=EFIQKU540P5BD8NE?results=5";
  $.getJSON(channelsAPI, {
    format: "json"
  })
  .done(function(data) {
    //console.log("got data");
  })

  var directions_form = document.getElementById("directions_form");

  var from_input = document.getElementById("from-input");
  var destination_input = document.getElementById("destination-input");

  map.controls[google.maps.ControlPosition.LEFT_TOP].push(directions_form);

  var from_autocomplete = new google.maps.places.Autocomplete(from_input,{});
  var destination_autocomplete = new google.maps.places.Autocomplete(destination_input,{});

  directionsDisplay.setMap(map);
}


function uploadData(){
  directionsDisplay.set('directions', null);
  //console.log("upload called");
  var from_address = document.getElementById("from-input").value;
  var destination_address = document.getElementById("destination-input").value;
  var transport_method = document.getElementById("transport_method").value;
  var method = null;

  switch (transport_method){
    case "walk":
    method = google.maps.TravelMode.WALKING;
    break;
    case "cycle":
    method = google.maps.TravelMode.BICYCLING;
    break
    default:
    break;
  }
  var DirectionsRequest = {
    origin: from_address,
    destination: destination_address,
    travelMode: method,
    provideRouteAlternatives: true
  };

  directionsService.route(DirectionsRequest, function(result, status) {
    console.log(result);
    var routes_Danger_Array = [];
    var sorted_Routes = [];
    if (status == google.maps.DirectionsStatus.OK) {
      for (var i = 0, len = result.routes.length; i<len; i++){
        var danger = calculateRouteDanger(result.routes[i]);
        routes_Danger_Array.push({index: i, danger: danger});
      }
      sorted_Routes = routes_Danger_Array.sort(route_DangerSort)
      console.log(sorted_Routes); 

      for (var i = 0, len = result.routes.length; i<len; i++){
        new google.maps.DirectionsRenderer({
          map: map,
          directions: result,
          routeIndex: sorted_Routes[i].index,
          polylineOptions: {
            strokeColor: getColorFromMag(i),
            strokeWeight: result.routes.length+1-i,
            strokeOpacity: 1/(i+1)
          }
        });
      }
    }

  });
  return false;
}

function getColorFromMag(mag){
  switch (mag){
    case 0:
    return "green";
    break;
    case 1: 
    return "orange";
    break;
    case 2:
    return "red";
    break;
    default:
    return "black";
    break;
  }
}

function calculateRouteDanger(route) {
  var route = route;
  var route_danger_total = 0;
  //console.log(route);
 // console.log("Got route");
 var number_steps = route.legs[0].steps.length;
 for (var i = 0; i<route.legs[0].steps.length; i++){
    //console.log("Got Step " + i + "\n");
    var steps = route.legs[0].steps[i];
    //console.log(steps.path);
    var step_start_lat = steps.path[0].lat();
    var step_start_lng = steps.path[0].lng();
    var step_end_lat = steps.path[steps.path.length - 1].lat();
    var step_end_lng = steps.path[steps.path.length - 1].lng();
    route_danger_total+=calculateStepDanger(step_start_lat, step_start_lng, step_end_lat, step_end_lng);
  }
  console.log("This Route's Danger Level is : " + route_danger_total/number_steps);
  return route_danger_total/number_steps;
}

function calculateStepDanger(slat, slng, elat, elng){
  //console.log("Calcuating Step Danger");
  return getClosestSensorScore(slat, slng) + getClosestSensorScore(elat, elng);
}


function route_DangerSort(a,b){
  if (a.danger==b.danger) {
    return 0;
  }
  else 
    return (a.danger < b.danger) ? -1 : 1;
}
function getClosestSensorScore(lat, lng) {
  var distance_array=[]
  for (var i = 0; i<sensor_Info.length; i++){
    var distance = (lat - sensor_Info[i].lat)*(lat - sensor_Info[i].lat) + (lng - sensor_Info[i].lng) * (lng - sensor_Info[i].lng);
    distance_array.push(distance);
  }
  var min = Math.min.apply(null,distance_array);
  var closestSensor = distance_array.indexOf(min)
  //console.log("Closest Sensor Mag: " + sensor_Info[closestSensor].mag);
  return sensor_Info[closestSensor].mag;
}
