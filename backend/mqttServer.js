const aedes = require('aedes')();
const httpServer = require('http').createServer();
const ws = require('websocket-stream');
const port = 8888;

ws.createServer({ server: httpServer }, aedes.handle);

const startMqttServer = () => {
  httpServer.listen(port, function () {
    console.log('MQTT Broker running on port: ' + port);
  });
};

aedes.on('client', function (client) {
  console.log('Client Connected: \x1b[33m' + (client ? client.id : client) + '\x1b[0m', 'to broker', aedes.id);
});

aedes.on('publish', function (packet, client) {
  if (client) {
    console.log('Client \x1b[31m' + (client ? client.id : client) + '\x1b[0m has published', packet.payload.toString(), 'on', packet.topic);
  }
});


module.exports = startMqttServer;
