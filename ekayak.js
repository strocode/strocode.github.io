'use strict'

let loc = {
    hostname: "www.bannister.id.au",
    port:443,
    useSSL:true
};

//loc = {hostname:'freya.bannister.id.au',port:9001,useSSL:false};



// Create a client instance
let client = new Paho.MQTT.Client(loc.hostname, Number(loc.port), "clientId");
let statusText = document.getElementById("status");

function setStatus(msg) {
  statusText.innerText = msg;
  console.log("Status changed:", msg);
}


// set callback handlers
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

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
  out.innerText = message.payloadString;

}