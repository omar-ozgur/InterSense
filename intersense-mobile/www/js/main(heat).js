var directionsDisplay;
var directionsService;
var map;

var sensor_Info = [];

var HeatMapData = [];

function initMap() {
  var channelsAPI = "https://thingspeak.com/channels/79178/feeds?api_key=EFIQKU540P5BD8NE?results=5";
  $.getJSON(channelsAPI, {
    format: "json"
  })
  .done(function(data) {
    var dataString = data.channel.latitude+" "+data.channel.longitude+" "+(data.feeds[0].field1+2)+" \\";
    console.log(dataString);
    temp_data+=dataString;
    createMap();
  })
}

function createMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 34.069858, lng: -118.445205 },
    zoom: 16,
    styles: mapStyle
  });

  

  console.log(temp_data);

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

    var latLng = {lat: parseFloat(split_values[i])-0.0005, lng: parseFloat(split_values[i+1])};
    HeatMapData.push({location: new google.maps.LatLng(parseFloat(split_values[i]), parseFloat(split_values[i+1])), weight: 1 - parseFloat(split_values[i+2])});

    var marker = new google.maps.Marker({
      position: latLng,
      map: map,
      mag: parseFloat(split_values[i+2]),
    });

    marker.setOpacity(0);
    
    var infowindow = new google.maps.InfoWindow;

    google.maps.event.addListener(marker, 'click', function () {
      infowindow.setContent("LPG Level: "+this.mag.toString());
      infowindow.open(map, this);
    });
  };

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
    radius: 50
  });
  heatmap.setMap(map);

  var directions_form = document.getElementById("directions_form");

  var from_input = document.getElementById("from-input");
  var destination_input = document.getElementById("destination-input");

  map.controls[google.maps.ControlPosition.LEFT_TOP].push(directions_form);

  var from_autocomplete = new google.maps.places.Autocomplete(from_input,{});
  var destination_autocomplete = new google.maps.places.Autocomplete(destination_input,{});

  directionsDisplay.setMap(map);
}


function uploadData(transport_method){
  var imageWalk = document.getElementById('walk');
  var imageBike = document.getElementById('bike');

  directionsDisplay.set('directions', null);
  //console.log("upload called");
  var from_address = document.getElementById("from-input").value;
  var destination_address = document.getElementById("destination-input").value;
  //var transport_method = document.getElementById("transport_method").value;
  var method = null;

  switch (transport_method){
    case "walk":
    method = google.maps.TravelMode.WALKING;
    imageWalk.src = "img/swalk.png";
    imageBike.src = "img/ubike.png";
    break;
    case "cycle":
    method = google.maps.TravelMode.BICYCLING;
    imageWalk.src = "img/uwalk.png";
    imageBike.src = "img/sbike.png";
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

var mapStyle = [
    {
        "featureType": "water",
        "elementType": "all",
        "stylers": [
            {
                "hue": "#7fc8ed"
            },
            {
                "saturation": 55
            },
            {
                "lightness": -6
            },
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "labels",
        "stylers": [
            {
                "hue": "#7fc8ed"
            },
            {
                "saturation": 55
            },
            {
                "lightness": -6
            },
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [
            {
                "hue": "#83cead"
            },
            {
                "saturation": 1
            },
            {
                "lightness": -15
            },
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "geometry",
        "stylers": [
            {
                "hue": "#f3f4f4"
            },
            {
                "saturation": -84
            },
            {
                "lightness": 59
            },
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "labels",
        "stylers": [
            {
                "hue": "#ffffff"
            },
            {
                "saturation": -100
            },
            {
                "lightness": 100
            },
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [
            {
                "hue": "#ffffff"
            },
            {
                "saturation": -100
            },
            {
                "lightness": 100
            },
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "labels",
        "stylers": [
            {
                "hue": "#bbbbbb"
            },
            {
                "saturation": -100
            },
            {
                "lightness": 26
            },
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "elementType": "geometry",
        "stylers": [
            {
                "hue": "#ffcc00"
            },
            {
                "saturation": 100
            },
            {
                "lightness": -35
            },
            {
                "visibility": "simplified"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [
            {
                "hue": "#ffcc00"
            },
            {
                "saturation": 100
            },
            {
                "lightness": -22
            },
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "poi.school",
        "elementType": "all",
        "stylers": [
            {
                "hue": "#d7e4e4"
            },
            {
                "saturation": -60
            },
            {
                "lightness": 23
            },
            {
                "visibility": "on"
            }
        ]
    }
];

var temp_data = "\
34.0734803131 -118.437745032 8.06388789587 \
34.0717024037 -118.445829452 3.28733763595 \
34.0651234746 -118.436993958 3.20201120197 \
34.0758527859 -118.451030583 8.61997121239 \
34.0721868879 -118.446522348 2.71082073406 \
34.0675226444 -118.446465614 5.935440089 \
34.0738142718 -118.443086639 5.54476724372 \
34.0758453453 -118.439374581 2.25211918927 \
34.0738769672 -118.450126734 4.40808011943 \
34.0714040161 -118.448365057 8.47513595441 \
34.0769680863 -118.454147881 6.85210391019 \
34.0720235179 -118.449470081 8.72474527053 \
34.0758722723 -118.446913535 6.69002317678 \
34.0736201898 -118.435177279 2.6147189872 \
34.0739404684 -118.437584032 5.38250622717 \
34.0738575744 -118.438150397 8.11281743712 \
34.0723228714 -118.439098265 5.17383817426 \
34.0673648299 -118.450464947 6.73823779059 \
34.0756709494 -118.444840369 5.21330157876 \
34.0714650735 -118.448376666 7.12549098179 \
34.0677475658 -118.444189207 5.56067621294 \
34.075157742 -118.439180218 9.4519847562 \
34.0718100866 -118.44632165 0.377566489363 \
34.0776830783 -118.440843661 2.46235768593 \
34.0714310611 -118.445127665 6.33812300875 \
34.0713097256 -118.442889454 3.00443014563 \
34.0685870033 -118.444363263 2.85480829266 \
34.0731687619 -118.438538285 3.97292517537 \
34.0683756767 -118.4461543 8.02420126557 \
34.0779975675 -118.446215597 7.4308061565 \
34.0683616116 -118.437557194 5.38759642666 \
34.0653910941 -118.445015551 8.62250752985 \
34.0714781714 -118.454745549 8.6772058394 \
34.075417173 -118.454215862 1.56117027992 \
34.0735249267 -118.446528847 4.17992440033 \
34.0756704809 -118.44194476 3.03347864965 \
34.0773372089 -118.440342203 5.23798656374 \
34.0741064477 -118.452586844 4.12580856608 \
34.0688188682 -118.44663039 8.65198644236 \
34.0677175372 -118.454734801 9.58793258474 \
34.0707576657 -118.453987782 7.10256827784 \
34.0759839134 -118.451212258 4.09469577009 \
34.0734191014 -118.45020588 8.99154485174 \
34.0761775617 -118.442677846 2.45258810062 \
34.0651600145 -118.436101527 2.60595836808 \
34.0663724446 -118.454295256 0.300894940129 \
34.0774169641 -118.448324894 2.2363827882 \
34.0727044801 -118.440448577 8.24814147612 \
34.0714177767 -118.444707092 0.349356219701 \
34.0701825159 -118.448261826 4.78635806904 \
34.0662553357 -118.438288255 764.739302317 \
34.0746579594 -118.450980096 98.113737004 \
34.0657271527 -118.437911538 94.2854171047 \
34.0771567304 -118.452925313 666.325176739 \
34.0714041382 -118.439467062 116.333760208 \
34.0669774046 -118.452622563 80.863964031 \
34.0692790571 -118.442231026 821.982962736 \
34.068136572 -118.454327274 575.78290722 \
34.0745212532 -118.441055078 333.295524246 \
34.0713704001 -118.439666806 891.082435867 \
34.075149019 -118.452716535 494.715148099 \
34.0667459404 -118.447443035 973.142364002 \
34.0653681659 -118.436258415 320.799890395 \
34.0765432793 -118.439602712 753.370348381 \
34.0709663752 -118.454282656 747.170518757 \
34.0713409375 -118.447786038 289.783487196 \
34.0652029457 -118.443676934 847.144028772 \
34.0758601123 -118.444367357 292.733143102 \
34.0706169834 -118.450878832 449.894296407 \
34.0665846946 -118.45299421 371.921275897 \
";
