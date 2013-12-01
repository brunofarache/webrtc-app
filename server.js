var app = require('http').createServer(handler),
	io = require('socket.io').listen(app, {
		log: false
	}),
	static = require('node-static'),
	server = new static.Server('./public');

app.listen(80);

function handler(request, response) {
	request.addListener('end', function() {
		server.serve(request, response);
	}).resume();
}

io.sockets.on('connection', function(socket) {
	socket.on('relay', function(message) {
		message.from = socket.id;

		io.sockets.socket(message.to).emit('relay', message);
	});

	socket.on('join', function(room) {
		if (room === '') {
			room = 'default';
		}

		console.log('join', room);

		var peers = io.sockets.clients(room).length;

		if (peers == 0) {
			socket.emit('created', room);
		}
		else {
			io.sockets.in(room).emit('join', socket.id);
		}

		socket.join(room);
	});

	socket.on('leave', function(room) {
		io.sockets.in(room).emit('leave', socket.id);

		socket.leave(room);
	});
});