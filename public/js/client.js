(function (window) {

var document = window.document,
	navigator = window.navigator;

if (!navigator.getUserMedia) {
	navigator.getUserMedia =
		navigator.getUserMedia ||
		navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia ||
		navigator.msGetUserMedia;
}

if (!window.URL) {
	window.URL =
		window.URL ||
		window.webkitURL ||
		window.msURL ||
		window.oURL;
}

if (!window.RTCPeerConnection) {
	window.RTCPeerConnection =
		window.mozRTCPeerConnection ||
		window.webkitRTCPeerConnection;
}

if (!window.RTCIceCandidate) {
	window.RTCIceCandidate = window.mozRTCIceCandidate;
}

var app = {
	peers: {},
	room: null,
	stream: null,

	start: function() {
		var instance = this,
			video = document.getElementById('local-video');

		navigator.getUserMedia(
			{
				'audio': true,
				'video': true
			},
			function (stream) {
				instance._attachStream(video, stream);
				video.muted = true;
				instance.stream = stream;

				socket.emit('join', location.hash);
			},
			function () {
				console.log('cannot access camera');
			}
		);
	},

	_attachStream: function(video, stream) {
		video.autoplay = true;
		video.src = window.URL.createObjectURL(stream);
	},

	_addIceCandidate: function(message) {
		var instance = this,
			peer = instance.peers[message.from];

		peer.addIceCandidate(new RTCIceCandidate(message.payload));
	},

	_answer: function(message) {
		var instance = this,
			peer = instance._createPeerConnection(message.from);

		instance._setRemoteDescription(message);

		var constraints = {
			'mandatory': {
				'OfferToReceiveAudio': true, 
				'OfferToReceiveVideo': true
			}
		};

		peer.createAnswer(instance._setLocalDescription.bind(instance, peer), null, constraints);
	},

	_offer: function(id) {
		var instance = this,
			peer = instance._createPeerConnection(id);

		peer.createOffer(instance._setLocalDescription.bind(instance, peer));
	},

	_createPeerConnection: function(id) {
		var instance = this,
			peer = new RTCPeerConnection({
				"iceServers": [{"url": "stun:stun.l.google.com:19302"}]
			}),
			peers = instance.peers,
			stream = instance.stream;

		peer.onicecandidate = instance._onIceCandidate.bind(instance, id);
		peer.onaddstream = instance._onAddStream.bind(instance, id);
		peer.addStream(stream);

		peer.id = id;
		peers[id] = peer;

		return peer;
	},

	_setLocalDescription: function(peer, description) {
		var instance = this;

		peer.setLocalDescription(description);

		socket.emit('relay', {
			'room': instance.room,
			'to': peer.id,
			'payload': description
		});
	},

	_setRemoteDescription: function(message) {
		var instance = this,
			peer = instance.peers[message.from];

		peer.setRemoteDescription(new RTCSessionDescription(message.payload));
	},

	_onIceCandidate: function(id, event) {
		var instance = this;

		if (event.candidate) {
			var payload = {
				type: 'candidate',
				sdpMLineIndex: event.candidate.sdpMLineIndex,
				candidate: event.candidate.candidate
			};

			socket.emit('relay', {
				'room': instance.room,
				'to': id,
				'payload': payload
			});
		}	
	},

	_onAddStream: function(id, event) {
		var instance = this,
			video = document.createElement('video');

		video.id = id;
		document.body.appendChild(video);

		instance._attachStream(video, event.stream);
	}
};

var socket = io.connect();

socket.on('relay', function (message) {
	var type = message.payload.type;

	if (type === 'offer') {
		app._answer(message);
	}
	else if (type === 'answer') {
		app._setRemoteDescription(message);
	}
	else if (type == 'candidate') {
		app._addIceCandidate(message);
	}
});

socket.on('join', function (id) {
	app._offer(id);
});

socket.on('created', function (room) {
	app.room = room;
});

window.app = app;

}(window));