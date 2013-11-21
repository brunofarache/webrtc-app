var app = require('http').createServer(handler),
	io = require('socket.io').listen(app, { log: false }),
	static = require('node-static'),
	server = new static.Server('./public');

app.listen(80);

function handler(request, response) {
	request.addListener('end', function () {
		server.serve(request, response);
	}).resume();
}

io.sockets.on('connection', function (socket) {
	socket.on('relay', function (message) {
		socket.broadcast.to(message.room).emit('relay', message.payload)
	});

	socket.on('join', function (room) {
		if (room === '') {
			room = 'default';
		}

		console.log('join', room);

		var peers = io.sockets.clients(room).length;

		if (peers == 1) {
			io.sockets.in(room).emit('join', room);
		}
		else if (peers == 0) {
			socket.emit('created', room);
		}

		socket.join(room);
	});
});