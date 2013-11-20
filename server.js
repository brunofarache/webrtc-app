var app = require('http').createServer(handler),
	io = require('socket.io').listen(app),
	static = require('node-static');

var server = new static.Server('./public');

app.listen(80);

function handler(request, response) {
	request.addListener('end', function () {
		server.serve(request, response);
	}).resume();
}

io.sockets.on('connection', function (socket) {
	socket.on('message', function (message) {
		console.log('server got message:', message);

		socket.broadcast.emit('message', message);
	});
});