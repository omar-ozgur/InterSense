var directionsDisplay;
var directionsService;
var map;
var mapStyle = [{
  'featureType': 'all',
  'elementType': 'all',
  'stylers': [{'visibility': 'on'}]
}];

var sensor_Info = [
{
  lat: 34.068575,
  lng: -118.448947,
  mag: 0
},
{
  lat: 34.070644,
  lng: -118.449295,
  mag: 4
},
{
  lat: 34.072,
  lng: -118.449295,
  mag: 3
},

{
  lat: 34.072644,
  lng: -118.429295,
  mag: 4
},
];

var HeatMapData = [];

function initMap() {

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
    if (status == google.maps.DirectionsStatus.OK) {
      for (var i = 0, len = result.routes.length; i<len; i++){
        calculateRouteDanger(result.routes[i]);
        new google.maps.DirectionsRenderer({
          map: map,
          directions: result,
          routeIndex: i,
          polylineOptions: {
            strokeColor: getColorFromMag(i)
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
  var route_danger = 0;
  //console.log(route);
 // console.log("Got route");
  for (var i = 0; i<route.legs[0].steps.length; i++){
    //console.log("Got Step " + i + "\n");
    var steps = route.legs[0].steps[i];
    //console.log(steps.path);
      var step_start_lat = steps.path[0].lat();
      var step_start_lng = steps.path[0].lng();
      var step_end_lat = steps.path[steps.path.length - 1].lat();
      var step_end_lng = steps.path[steps.path.length - 1].lng();
      route_danger+=calculateStepDanger(step_start_lat, step_start_lng, step_end_lat, step_end_lng);
  }
  console.log("This Route's Danger Level is : " + route_danger);
}

function calculateStepDanger(slat, slng, elat, elng){
  //console.log("Calcuating Step Danger");
  return getClosestSensorScore(slat, slng) + getClosestSensorScore(elat, elng);
}

function getClosestSensorScore(lat, lng) {
  var distance_array=[]
  for (var i = 0; i<sensor_Info.length; i++){
    var distance = (lat - sensor_Info[i].lat)*(lat - sensor_Info[i].lat) + (lng - sensor_Info[i].lng) * (lng - sensor_Info[i].lng);
    distance_array.push(distance);
  }
  //console.log(distance_array);
  var min = Math.min.apply(null,distance_array);
  var closestSensor = distance_array.indexOf(min)
 // console.log(sensor_Info[closestSensor].mag);
  return sensor_Info[closestSensor].mag;
}