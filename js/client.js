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

var client = {
	user1: {},
	user2: {},

	start: function() {
		var instance = this,
			user1 = instance.user1,
			video1 = document.getElementById('video1');

		navigator.getUserMedia(
			{
				audio: true,
				video: true
			},
			function (stream) {
				video1.autoplay = true;
				video1.src = window.URL.createObjectURL(stream);
				user1.stream = stream;

				instance.call();
			},
			function () {
				console.log('cannot access camera');
			}
		);
	},

	call: function() {
		var instance = this,
			user1 = instance.user1,
			user2 = instance.user2;

		var videoTracks = user1.stream.getVideoTracks(),
			audioTracks = user1.stream.getAudioTracks();

		if (videoTracks.length > 0) {
			console.log('video: ', videoTracks[0].label);
		}

		if (audioTracks.length > 0) {
			console.log('audio: ', audioTracks[0].label);
		}

		user1.peerConnection = new RTCPeerConnection(null);
		user2.peerConnection = new RTCPeerConnection(null);

		user1.peerConnection.onicecandidate = instance._onIceCandidate1.bind(instance);
		user2.peerConnection.onicecandidate = instance._onIceCandidate2.bind(instance);

		user2.peerConnection.onaddstream = instance._onStream.bind(instance);

		user1.peerConnection.addStream(user1.stream);
		user1.peerConnection.createOffer(instance._onOffer.bind(instance));
	},

	_onAnswer: function(description) {
		var instance = this,
			user1 = instance.user1,
			user2 = instance.user2;

		console.log('_onAnswer', description);

		user2.peerConnection.setLocalDescription(description);
		user1.peerConnection.setRemoteDescription(description);
	},

	_onIceCandidate1: function(event) {
		var instance = this,
			user2 = instance.user2;

		if (event.candidate) {
			console.log('_onIceCandidate1', event.candidate.candidate);

			user2.peerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
		}	
	},

	_onIceCandidate2: function(event) {
		var instance = this,
			user1 = instance.user1;

		if (event.candidate) {
			console.log('_onIceCandidate2', event.candidate.candidate);

			user1.peerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
		}	
	},

	_onOffer: function(description) {
		var instance = this,
			user1 = instance.user1,
			user2 = instance.user2;

		console.log('_onOffer', description);

		user1.peerConnection.setLocalDescription(description);
		user2.peerConnection.setRemoteDescription(description);

		user2.peerConnection.createAnswer(instance._onAnswer.bind(instance), null,
			{
				'mandatory': {
					'OfferToReceiveAudio': true, 
					'OfferToReceiveVideo': true
				}
		    }
		);
	},

	_onStream: function(event) {
		var instance = this,
			video2 = document.getElementById('video2');

		console.log('_onStream', event);
		
		video2.autoplay = true;
		video2.src = window.URL.createObjectURL(event.stream);
	}
};

window.client = client;

}(window));