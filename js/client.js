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
	peer: new RTCPeerConnection(null),

	start: function() {
		var instance = this,
			peer = instance.peer,
			video1 = document.getElementById('video1');

		navigator.getUserMedia(
			{
				audio: true,
				video: true
			},
			function (stream) {
				video1.autoplay = true;
				video1.src = window.URL.createObjectURL(stream);
				
				instance._createPeerConnection(stream);
			},
			function () {
				console.log('cannot access camera');
			}
		);
	},

	call: function() {
		var instance = this,
			peer = instance.peer;

		peer.createOffer(instance._setLocalDescription.bind(instance));
	},

	_addIceCandidate: function(message) {
		var instance = this,
			peer = instance.peer;

		peer.addIceCandidate(new RTCIceCandidate(message));
	},

	_answer: function(message) {
		var instance = this,
			peer = instance.peer;

		instance._setRemoteDescription(message);

		var constraints = {
			'mandatory': {
				'OfferToReceiveAudio': true, 
				'OfferToReceiveVideo': true
			}
		};

		peer.createAnswer(instance._setLocalDescription.bind(instance), null, constraints);
	},

	_createPeerConnection: function(stream) {
		var instance = this,
			peer = instance.peer;

		peer.onicecandidate = instance._onIceCandidate.bind(instance);
		peer.onaddstream = instance._onAddStream.bind(instance);
		peer.addStream(stream);
	},

	_setLocalDescription: function(description) {
		var instance = this,
			peer = instance.peer;

		peer.setLocalDescription(description);

		socket.emit('message', description);
	},

	_setRemoteDescription: function(message) {
		var instance = this,
			peer = instance.peer;

		peer.setRemoteDescription(new RTCSessionDescription(message));
	},

	_onIceCandidate: function(event) {
		var instance = this,
			peer = instance.peer;

		if (event.candidate) {
			var message = {
				type: 'candidate',
				sdpMLineIndex: event.candidate.sdpMLineIndex,
				candidate: event.candidate.candidate
			};

			socket.emit('message', message);
		}	
	},

	_onAddStream: function(event) {
		var instance = this,
			video2 = document.getElementById('video2');

		video2.autoplay = true;
		video2.src = window.URL.createObjectURL(event.stream);
	}
};

var socket = io.connect('http://localhost:9000');

socket.on('message', function (message) {
	var type = message.type;

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

window.app = app;

}(window));