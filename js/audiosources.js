var constraints = {
  audio: true,
  video: false,
};
// Get a list of the available camera devices
function getSources(request) {
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function (stream) {
      var audiodevices = [];
      navigator.mediaDevices.enumerateDevices().then(function (devices) {
        devices.forEach(function (device) {
          if (device.kind == "audioinput") {
            audiodevices.push({ label: device.label, id: device.deviceId });
          }
        });
        chrome.runtime.sendMessage({
          type: "sources-audio",
          devices: audiodevices,
        });
        stream.getTracks().forEach(function (track) {
          track.stop();
        });
      });
    })
    .catch(function (error) {
      chrome.runtime.sendMessage({ type: "sources-audio-noaccess" });
    });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type == "camera-request") {
    getSources(request);
  }
});

chrome.runtime.sendMessage({ type: "sources-loaded" });
