'use strict'

const loc = {
    hostname: "freya.bannister.id.au",
    port:9001

};

// Create a client instance
let client = new Paho.MQTT.Client(loc.hostname, Number(loc.port), "clientId");

// set callback handlers
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

// connect the client


function login() {
  let username = document.getElementById("username").value;
  let password = document.getElementById("password").value;

  client.connect({onSuccess:onConnect, userName:username, password:password});

}

// called when the client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  console.log("onConnect");
  client.subscribe("ekayak");
  // let message = new Paho.MQTT.Message("Hello");
  // message.destinationName = "World";
  // client.send(message);
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject.errorMessage);
  }
}

// called when a message arrives
function onMessageArrived(message) {
  console.log("onMessageArrived:"+message.payloadString);
  console.log(message)
  console.log("Destionation", message.destinationName);
  console.log("QoS", message.qos);
  console.log("Retrained", message.retained);
  
  console.log("Duplicate", message.duplicate);

  let out = document.getElementById("lastmessage");
  out.innerText = message.payloadString;

}