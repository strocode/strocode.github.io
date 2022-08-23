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

var zoomLevel = 16;

// Create a client instance
let client = new Paho.MQTT.Client(loc.hostname, Number(loc.port), "clientId");

// set callback handlers
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

let statusText = document.getElementById("status");
let locationText = document.getElementById("location")

var map = L.map('map').fitWorld();
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);
var breadCrumbLine = L.polyline([]).addTo(map);
var locationCircle = L.circle([0,0]).addTo(map);

function locationSuccess(position) {
  const c = position.coords;
  locationText.textContent = `lat/long:${c.latitude}/${c.longitude} speed:${c.speed} heading:${c.heading} altitude:${c.altitude} accuracy:${c.accuracy} altaccuracy:${c.altitudeAccuracy} timestamp:${position.timestamp}`;
  const latlng = [c.latitude, c.longitude];
  map.setView(latlng, zoomLevel);
  breadCrumbLine.addLatLng(latlng);
  locationCircle.setLatLng(latlng);
  locationCircle.setRadius(c.accuracy);
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
function onMessageArrived(message) {
  console.log("onMessageArrived:",message.payloadString);
  console.log(message)
  console.log("Destionation", message.destinationName);
  console.log("QoS", message.qos);
  console.log("retained", message.retained);  
  console.log("Duplicate", message.duplicate);

  let out = document.getElementById("lastmessage");
  out.textContent = message.payloadString;

}