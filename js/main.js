var directionsDisplay;
var directionsService;
var map;

var sensor_Info = [];

var HeatMapData = [];

var routes_Danger_Array = [];
  var sorted_Routes = [];

  var darray = [];

function initMap() {
  directionsDisplay = new google.maps.DirectionsRenderer();
  directionsService = new google.maps.DirectionsService();

  var channelsAPI = "https://thingspeak.com/channels/79178/feeds?api_key=EFIQKU540P5BD8NE?results=5";
  $.getJSON(channelsAPI, {
    format: "json"
  })
  .done(function(data) {
    var dataString = data.channel.latitude+" "+data.channel.longitude+" "+(data.feeds[0].field1+2)+" \\";
    temp_data+=dataString;
    createMap();
  })
}

function createMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 34.069858, lng: -118.445205 },
    zoom: 15,
    styles: mapStyle
  });

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

    var color = getColorFromMag(marker.mag);

    // Add circle overlay and bind to marker
    var circle = new google.maps.Circle({
      map: map,
      radius: 80,    // 10 miles in metres
      fillOpacity: 0.3,
      strokeOpacity: 0.0,
      fillColor: color
    });
    circle.bindTo('center', marker, 'position');
    
    var infowindow = new google.maps.InfoWindow;

    google.maps.event.addListener(marker, 'click', function () {
      infowindow.setContent("LPG Level: "+this.mag.toString());
      infowindow.open(map, this);
    });
  };

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
    radius: 0
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

    for (var i = 0; i < darray.length; i++){
        darray[i].setMap(null);
        darray[i] = null;
      }
      darray = [];
      sorted_Routes = [];
      routes_Danger_Array = [];

    if (status == google.maps.DirectionsStatus.OK) {
      for (var i = 0, len = result.routes.length; i<len; i++){
        var danger = calculateRouteDanger(result.routes[i]);
        routes_Danger_Array.push({index: i, danger: danger});
      }
      sorted_Routes = routes_Danger_Array.sort(route_DangerSort)
      console.log(sorted_Routes); 

      directionsDisplay.setMap(null);

      directionsDisplay.setDirections(result);

      for (var i = 0, len = result.routes.length; i<len; i++){
        directionsDisplay = new google.maps.DirectionsRenderer({
          directions: result,
          map: map,
          routeIndex: sorted_Routes[i].index,
          polylineOptions: {
            strokeColor: getColorFromMag(routes_Danger_Array[i].danger),
            strokeWeight: 5,
            strokeOpacity: 1
          }
        });
        darray.push(directionsDisplay);
      }

      directionsDisplay.setMap(map);
    }

  });
  return false;
}

function getColorFromMag(mag){
  var low = [151, 83, 34];   // color of mag 1.0
  var high = [5, 69, 54];  // color of mag 6.0 and above
  var minMag = 0.0;
  var maxMag = 1000.0;

  // fraction represents where the value sits between the min and max
  var fraction = (Math.min(mag, maxMag) - minMag) /
    (maxMag - minMag);

  var color = interpolateHsl(low, high, fraction);
  return color;
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

function interpolateHsl(lowHsl, highHsl, fraction) {
  var color = [];
  for (var i = 0; i < 3; i++) {
    // Calculate color based on the fraction.
    color[i] = (highHsl[i] - lowHsl[i]) * fraction + lowHsl[i];
  }

  return 'hsl(' + color[0] + ',' + color[1] + '%,' + color[2] + '%)';
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
34.0637201626 -118.467485707 246.151411853 \
34.0722697362 -118.419035871 96.1067960447 \
34.087319269 -118.455376369 287.97753994 \
34.0894757969 -118.446994436 381.622910584 \
34.0913649883 -118.461558637 212.807773851 \
34.080519945 -118.42465235 1.292648136 \
34.0622847505 -118.435312396 249.623062369 \
34.072687473 -118.434055057 965.126732346 \
34.0966368138 -118.437821575 371.742486148 \
34.0611829957 -118.444234688 963.017049953 \
34.0729171672 -118.434205892 576.014637244 \
34.0613423713 -118.43079711 830.9241353 \
34.073055993 -118.460949776 946.254309277 \
34.0975945911 -118.473422306 736.434466058 \
34.0632536857 -118.426634274 311.039384917 \
34.0820092071 -118.440298903 934.703964842 \
34.0881414191 -118.425719985 802.982387307 \
34.0521412059 -118.415685898 38.1581024331 \
34.0815239543 -118.473128499 257.575279725 \
34.0977990574 -118.423741898 576.464413198 \
34.048210543 -118.440658636 136.015153016 \
34.0599632056 -118.43284793 818.629678936 \
34.048096435 -118.438946824 964.508964298 \
34.0962962882 -118.453471985 617.48051045 \
34.0924081336 -118.440835905 242.003225572 \
34.0769189034 -118.457655631 678.971687736 \
34.0562361024 -118.417405711 840.828970499 \
34.0556620254 -118.430857388 197.210742693 \
34.0737612326 -118.443123234 608.270979246 \
34.075716181 -118.421233567 889.686533579 \
34.095310364 -118.466400487 643.559570899 \
34.0965404603 -118.421598498 113.049352716 \
34.0798080981 -118.449229656 796.412323203 \
34.0521175443 -118.420382125 889.122226721 \
34.0951117676 -118.463676971 373.853664085 \
34.0505189308 -118.43763672 722.723305243 \
34.05446314 -118.472856517 699.344006306 \
34.0557075886 -118.45506713 51.2597683883 \
34.0842440206 -118.421129331 87.2712788221 \
34.0856158884 -118.459241022 381.780575852 \
34.0890900997 -118.459331149 315.903405199 \
34.0895616842 -118.436355129 44.1642321314 \
34.0594266708 -118.456001249 653.152294196 \
34.0715254963 -118.430778966 463.823634513 \
34.0500030723 -118.462887312 815.353929163 \
34.0472042472 -118.427640488 252.998088476 \
34.0663192715 -118.473522571 297.651730214 \
34.0524774751 -118.435766772 914.612747959 \
34.0883463163 -118.461529832 964.93691958 \
34.0690419245 -118.415770341 545.622039627 \
34.0760078698 -118.433906193 935.556572381 \
34.0889786781 -118.472723477 645.305111038 \
34.0599481401 -118.446838832 89.8853905857 \
34.0878497688 -118.446770305 792.412750028 \
34.0570037992 -118.430967684 284.361045123 \
34.0466084697 -118.454266574 368.63161483 \
34.0768574995 -118.461440386 379.138192038 \
34.0795605408 -118.422566711 114.363025574 \
34.073404075 -118.418203764 963.787954601 \
34.0513656978 -118.434382118 36.7656372994 \
34.0855286434 -118.463852085 763.834649779 \
34.0943623353 -118.468554161 859.716816777 \
34.0497798939 -118.442411082 313.72067697 \
34.0971827595 -118.416697726 484.244812891 \
34.0876228625 -118.428014774 773.166407795 \
34.0751659892 -118.442138592 303.193221935 \
34.0830635038 -118.432681824 84.9453292032 \
34.089363202 -118.466138138 79.5574153388 \
34.0511587942 -118.445641443 556.089318641 \
34.0723279417 -118.453654328 584.362728129 \
34.0763008334 -118.465002791 718.635236869 \
34.0939236206 -118.461277829 983.274921113 \
34.0859269224 -118.426853439 471.88821965 \
34.0543068912 -118.424585766 558.954343264 \
34.0539585067 -118.434489573 960.320568917 \
34.0863335989 -118.43233048 846.847078581 \
34.0903976273 -118.415893782 101.178769214 \
34.0976990909 -118.466906852 337.300060609 \
34.0963318213 -118.416014428 803.323610335 \
34.0653183278 -118.434703893 18.0775714412 \
34.0760658041 -118.422507162 625.755206192 \
34.0544711981 -118.459601615 37.3765970301 \
34.0571045839 -118.467615165 818.707650532 \
34.088113707 -118.433716135 935.939467375 \
34.0701641813 -118.459689089 489.027613379 \
34.0727371742 -118.4531011 30.9882277783 \
34.0560278825 -118.463816728 461.814721774 \
34.0902786048 -118.425140249 593.124305997 \
34.0850953972 -118.447506 639.231424736 \
34.0638886313 -118.457212514 721.702607672 \
34.0795351265 -118.465419401 838.834359514 \
34.0733740131 -118.459636335 914.519545698 \
34.0462714736 -118.474181954 627.853591743 \
34.0742725167 -118.436755089 64.4245457909 \
34.0534970666 -118.459191714 272.328128425 \
34.0788944201 -118.441123782 131.873807461 \
34.0674718889 -118.444785532 406.079471097 \
34.0795177215 -118.44917242 61.6787731892 \
34.0952343379 -118.467513082 48.7923742404 \
34.0595661522 -118.42937569 258.170128342 \
";
