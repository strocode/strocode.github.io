'use strict'

let loc = {
    hostname: "www.bannister.id.au",
    port:443,
    useSSL:true
};

// location poptions https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition
const locationOptions = {
  enableHighAccuracy: true,
  maximumAge: 10000, // milliseconds
  timeout: 700 // milliseconds
};

var zoomLevel = 17;

// Create a client instance
let client = new Paho.MQTT.Client(loc.hostname, Number(loc.port), "clientId");

// set callback handlers
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

let statusText = document.getElementById("status");
let locationText = document.getElementById("location")
let npositions = 0;

var map = L.map('map').fitWorld();
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 21,
    attribution: '© OpenStreetMap'
}).addTo(map);
var breadCrumbLine = L.polyline([]).addTo(map);
var locationCircle = L.circle([0,0]).addTo(map);


// Create charts
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
      label: 'Humidity',
      data: [],
      borderColor: 'rgba(255, 99, 132, 1)',
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      yAxisID: 'y1',
    }
  ]
};

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

const temperatureChart = new Chart('temperatureChart', temperatureConfig);
const locationChart = new Chart('locationChart', locationConfig);

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

function locationSuccess(position) {
  const c = position.coords;
  locationText.textContent = `lat/long:${c.latitude}/${c.longitude} speed:${c.speed} heading:${c.heading} altitude:${c.altitude} accuracy:${c.accuracy} altaccuracy:${c.altitudeAccuracy} timestamp:${position.timestamp}`;
  const latlng = [c.latitude, c.longitude];
  if (npositions == 0) {
    //map.flyTo(latlng, Number(zoomLevel), {animate:true}); // Flying takes too long and stops when the next location comes in
    map.setView(latlng, zoomLevel);
  } else {
    map.panTo(latlng);
  }
  breadCrumbLine.addLatLng(latlng);
  locationCircle.setLatLng(latlng);
  locationCircle.setRadius(c.accuracy);

  npositions = npositions + 1;
  addData(locationChart, npositions, [c.speed, c.heading])
  
}

function locationError(error) {
  locationText.textContent = `GEOLOCATION ERROR(${error.code}): ${error.message}`;
}

// setup geolocation
if ('geolocation' in navigator) {
  const watchID = navigator.geolocation.watchPosition(locationSuccess, locationError, locationOptions);
} else {
  locationText.textContent = "Geolocation not supported in this browser";
}


function setStatus(msg) {
  statusText.textContent = msg;
  console.log("Status changed:", msg);
}


function login() {
  let username = document.getElementById("username").value;
  let password = document.getElementById("password").value;
  // For more options, see here: https://www.eclipse.org/paho/files/jsdoc/Paho.MQTT.Client.html
  let options = {
    timeout:3,
    userName:username,
    password:password,
    onSuccess:onConnect,
    onFailure:onConnectionLost,
    useSSL:loc.useSSL,
    //reconnect:true
  }

  setStatus("Connecting...");
  client.connect(options);

}

// called when the client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  console.log("onConnect");
  client.subscribe("ekayak");
  // let message = new Paho.MQTT.Message("Hello");
  // message.destinationName = "World";
  // client.send(message);
  setStatus("Connected");
}

// called when the client loses its connection
function onConnectionLost(responseObject) {  
  setStatus(`Connection lost: ${responseObject.errorMessage}`);
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject.errorMessage);
  }
}

// called when a message arrives
let nmsg = 0;
function onMessageArrived(message) {
  console.log("onMessageArrived:",message.payloadString);
  console.log(message)
  console.log("Destionation", message.destinationName);
  console.log("QoS", message.qos);
  console.log("retained", message.retained);  
  console.log("Duplicate", message.duplicate);

  let out = document.getElementById("lastmessage");
  out.textContent = message.payloadString;

  let data = JSON.parse(message.payloadString);
  
  addData(temperatureChart, nmsg, [data.internal_temp, data.external_temp, data.relative_humidity])
  
  nmsg += 1;  

}