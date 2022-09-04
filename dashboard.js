"use strict";

let loc = {
    hostname: "www.bannister.id.au",
    port:443,
    useSSL:true
};

// location options https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition
const locationOptions = {
  enableHighAccuracy: true,
  maximumAge: 10000, // milliseconds
  timeout: 700 // milliseconds
};

var zoomLevel = 17;
var mqtt_client, map, breadCrumbLine, locationCircle, locationChart, temperatureChart;
var mqtt_message_count = 0;
let statusText = document.getElementById("status");
let locationText = document.getElementById("location")
let npositions = 0;
var connectOptions = {};
let positionUserName = null; // If you get a position from mqtt topic position/$user then update the UI with that position
let userLastPositions = {}; // dictionary of most recent posObj keyed by user name
// make this null if you want to use your local position measurementes
// TODO: Make this configurable in the UI


function dashboard_init() {
  
  map_init();
  temp_chart_init();
  location_chart_init();

}


function setStatus(msg) {
  // statusText.textContent = msg;
  console.log("Status changed:", msg);
}


function mqtt_login() {
  let username = document.getElementById("username").value;
  let password = document.getElementById("password").value;
  // For more options, see here: https://www.eclipse.org/paho/files/jsdoc/Paho.MQTT.Client.html
  connectOptions = {
    timeout:30,
    userName:username,
    password:password,
    onSuccess:onConnect,
    onFailure:onConnectionLost,
    useSSL:loc.useSSL,
    //reconnect:true
  }

  // setStatus("Connecting...");
  $('#debug_logs').append("MQTT Client connecting...");

  //  Make a unique-ish, random client ID
  const randint = Math.floor(Math.random()*1024*1024);
  // Client ID must be unique otherwise it disconnects the other client.
  // Ah wait, but "It is only used to identify the client to the broker when the connection is established in order to determine if stored messages and persistent subscriptions should be honoured.
  // Hmm, not sure if we want unique ones or not.
  const clientId = `${username}-${randint}`;
  
  // Create a client instance
  mqtt_client = new Paho.MQTT.Client(loc.hostname, Number(loc.port), clientId);

  // set callback handlers
  mqtt_client.onConnectionLost = onConnectionLost;
  mqtt_client.onMessageArrived = onMessageArrived;
  mqtt_client.connect(connectOptions);
  return false

}

// called when the mqtt_client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  console.log("onConnect");
  mqtt_client.subscribe("ekayak");
  mqtt_client.subscribe("position/+"); // subscribe to all users sending positions
  
  $('#debug_logs').append("MQTT Client Connected!");
  $('.login_icon').removeClass('text-red-500');
  $('.login_icon').addClass('text-green-500');
}

// called when the mqtt_client loses its connection
function onConnectionLost(responseObject) {  
  // setStatus(`Connection lost: ${responseObject.errorMessage}`);
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject.errorMessage);
  }
  $('#debug_logs').append("onConnectionLost:"+responseObject.errorMessage);
  $('.login_icon').removeClass('text-green-500');
  $('.login_icon').addClass('text-red-500');
}


function updateTelemetry(data) {
  addData(temperatureChart, mqtt_message_count, [data.internal_temp, data.external_temp, data.esc_temp, data.relative_humidity])

  let voltStr = data.battery_voltage.toFixed(1) + ' V';
  let tempStr = data.esc_temp.toFixed(1) + ' Deg.';
  let rpmStr = data.rpm.toFixed(0);
  $('#battery_voltage').html(voltStr);
  $('#controller_temp').html(tempStr);
  $('#rpm').html(rpmStr);
}

function updateUserPosition(sendingUser, posobj) {
  // called a position received from a sendingUser
  // may or may not be a new user

  const locationUserList = document.getElementById('locationUser');
  var $el = $('#locationUser');

  // Add new user to list 
  if (!(sendingUser in userLastPositions)) {
    $el.append($("<option></option>")
    .attr("value", sendingUser).text(sendingUser));
  }

  // update list of sending locations
  userLastPositions[sendingUser] = posobj;
}

function locationUserChanged() {
  var newUserName = document.getElementById("locationUser").value;
  if (newUserName == '') {
    newUserName = null;
  }
  positionUserName = newUserName; // Update position user global variable
  const userLocation = userLastPositions[newUserName];
  console.log('Location user changed to', newUserName, userLocation);
  clearData(locationChart); // clear chart
  breadCrumbLine.setLatLngs([]); // clear breadcrumbs on map
  updatePosition(userLocation);  // Add new latest value
}

function onMessageArrived(message) {
  console.log("onMessageArrived:",message.payloadString);
  console.log(message)
  console.log("Destination", message.destinationName);
  console.log("QoS", message.qos);
  console.log("retained", message.retained);  
  console.log("Duplicate", message.duplicate);

  // let out = document.getElementById("lastmessage");
  // out.textContent = message.payloadString;
  $('#debug_logs').append(message.payloadString);

  let data = JSON.parse(message.payloadString);
  const destName = message.destinationName;

  if (destName == "ekayak") {
    updateTelemetry(data);
  } else if (destName.startsWith("position/")) {
    const sendingUser = destName.split("/")[1];
    updateUserPosition(sendingUser, data);

    if (sendingUser == positionUserName) {
      updatePosition(data);
    }
  }
  
  mqtt_message_count += 1;  

}


function map_init() {
  map = L.map('map').fitWorld();
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 21,
      attribution: '© OpenStreetMap'
  }).addTo(map);
  breadCrumbLine = L.polyline([]).addTo(map);
  locationCircle = L.circle([0,0]).addTo(map);
}


function temp_chart_init() {
  const temperatureData = {
    labels: [],
    datasets: [
      {
        label: 'Internal Temp',
        data: [],
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        yAxisID: 'y',
      },
      {
        label: 'External Temp',
        data: [],
        borderColor: 'rgba(0, 99, 182, 1)',
        backgroundColor: 'rgba(0, 99, 182, 0.2)',
        yAxisID: 'y',
      },
      {
        label: 'ESC Temp',
        data: [],
        borderColor: 'rgba(89, 150, 182, 1)',
        backgroundColor: 'rgba(89, 99, 182, 0.2)',
        yAxisID: 'y',
      },
      {
        label: 'Humidity',
        data: [],
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        yAxisID: 'y1',
      }
    ]
  };

  const temperatureConfig = {
    type: 'line',
    data: temperatureData,
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      stacked: false,
      plugins: {
        title: {
          display: true,
          text: 'Temperature & humidity'
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display:true,
            text: 'Temperature (deg)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display:true,
            text: 'Relative humidity (%)'
          },

          // grid line settings
          grid: {
            drawOnChartArea: false, // only want the grid lines for one axis to show up
          },
        },
      }
    },
  };

  temperatureChart = new Chart('temperatureChart', temperatureConfig);

}




function location_chart_init() {
  const locationData = {
    labels: [],
    datasets: [
      {
        label: 'Speed',
        data: [],
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        yAxisID: 'y',
      },
      {
        label: 'Heading',
        data: [],
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        yAxisID: 'y1',
      }
    ]
  };


  const locationConfig = {
    type: 'line',
    data: locationData,
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      stacked: false,
      plugins: {
        title: {
          display: true,
          text: 'Location'
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display:true,
            text: 'Speed (m/s)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display:true,
            text: 'Heading (deg)'
          },

          // grid line settings
          grid: {
            drawOnChartArea: false, // only want the grid lines for one axis to show up
          },
        },
      }
    },
  };

  locationChart = new Chart('locationChart', locationConfig);

}

function positionToObject(position) {
    // JSON can't serialise the position data for some reason - so make our own

  const c = position.coords;

  let positionObj = {latitude:c.latitude,
  longitude:c.longitude,
  accuracy:c.accuracy,
  speed:c.speed,
  heading:c.heading,
  altitude:c.altitude,
  altitudeAccuracy:c.altitudeAccuracy,
  timestamp:position.timestamp};

  return positionObj;
}

function updatePosition(positionObj) {
  const c = positionObj;
  const latlng = [c.latitude, c.longitude];
  if (npositions == 0) {
    //map.flyTo(latlng, Number(zoomLevel), {animate:true}); // Flying takes too long and stops when the next location comes in
    map.setView(latlng, zoomLevel); // Set zoom level the first time as we started in world view
  } else {
    map.panTo(latlng); // user might use UI to change zoom level - don't want to set back to default
  }
  breadCrumbLine.addLatLng(latlng);
  locationCircle.setLatLng(latlng);
  locationCircle.setRadius(c.accuracy);

  npositions = npositions + 1;

  $('#gps_speed').html(`${Math.round(c.speed * 36)/10} km/h`);
  $('#current_trip').html('0 km');
  $('#debug_logs').append(`lat/long:${c.latitude}/${c.longitude} speed:${c.speed} heading:${c.heading} altitude:${c.altitude} accuracy:${c.accuracy} altaccuracy:${c.altitudeAccuracy} timestamp:${c.timestamp}`);
  $('#debug_logs').append(`<br>${Math.round(c.speed * 36)/10} km/h`);

  addData(locationChart, npositions, [c.speed, c.heading])
}


function locationSuccess(position) {
  
  const posobj = positionToObject(position);

  // Always save the current location to the null user
  userLastPositions[null] = posobj;

  if (positionUserName === null) { // update UI if we're not using positions from MQTT
    updatePosition(posobj); // update UI
  }

  // send data to mqtt
  const payload = JSON.stringify(posobj);
  const topic = 'position/'+connectOptions.userName;
  const qos = 0; // best effort
  const retained = true; // Let new subscribers know our last position as soon as they subscribe
  try { 
    mqtt_client.send(topic, payload, qos, retained);
  } catch (invalidState) {
    // Client isn't connected. Oh well. Don't really care I don't think.
  }
}

function locationError(error) {
  // locationText.textContent = `GEOLOCATION ERROR(${error.code}): ${error.message}`;
  console.log(`GEOLOCATION ERROR(${error.code}): ${error.message}`)
}

// setup geolocation
if ('geolocation' in navigator) {
  const watchID = navigator.geolocation.watchPosition(locationSuccess, locationError, locationOptions);
} else {
  // locationText.textContent = "Geolocation not supported in this browser";
}




// Chart update functions: https://www.chartjs.org/docs/latest/developers/updates.html
function addData(chart, label, data) {
  chart.data.labels.push(label);
  chart.data.datasets.forEach((dataset, i) => {
      dataset.data.push(data[i]);
  });
  chart.update();
}

function removeData(chart) {
  chart.data.labels.pop();
  chart.data.datasets.forEach((dataset) => {
      dataset.data.pop();
  });
  chart.update();
}

function clearData(chart) {
  chart.data.labels.length = 0;
  chart.data.datasets.forEach((dataset) => {
      dataset.data.length = 0;
  });
  chart.update();
}

// On Apline ready
document.addEventListener('alpine:init', () => {
  dashboard_init();

});



