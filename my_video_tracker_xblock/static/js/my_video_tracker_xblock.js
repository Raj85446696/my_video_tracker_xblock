window.VideoEngagementXBlockInit = function (runtime, element, data) {
  console.log("✅ JS initialized: VideoEngagementXBlockInit");
  console.log("▶️ Video URL:", data.videoUrl);

  const xblockWebcamVideo = element.querySelector("#xblockWebcamVideo");
  const xblockFaceDetectionCanvas = element.querySelector("#xblockFaceDetectionCanvas");

  const xblockModelLoadStatus = element.querySelector("#xblockModelLoadStatus");
  const xblockWebcamStatus = element.querySelector("#xblockWebcamStatus");
  const xblockVideoPlayingStatus = element.querySelector("#xblockVideoPlayingStatus");
  const xblockVideoTimeStatus = element.querySelector("#xblockVideoTimeStatus");
  const xblockTabActiveStatus = element.querySelector("#xblockTabActiveStatus");
  const xblockFaceDetectedStatus = element.querySelector("#xblockFaceDetectedStatus");
  const xblockTimeWatched = element.querySelector("#xblockTimeWatched");

  const videoUrl = data.videoUrl;
  const trackEventHandlerUrl = data.trackEventHandlerUrl;

  let isTabActive = true;
  let faceDetectionInterval = null;
  let mediaStream = null;
  let modelsLoaded = false;
  const detectionIntervalTime = 3000;
  let currentTime = 0;

  let xblockVideo = null;

  function setupVideoElement() {
    const videoContainer = element.querySelector("#videoContainer");
    const isYouTube = /youtube\.com|youtu\.be/.test(videoUrl);

    if (isYouTube) {
      const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
      const videoId = match ? match[1] : null;
      const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1` : videoUrl;

      videoContainer.innerHTML = `<iframe id="xblockVideoIframe" width="640" height="360" src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
      // YouTube player API (not fully supported inside XBlock iframe; limited control)
    } else {
      videoContainer.innerHTML = `<video id="xblockVideo" width="640" height="360" controls style="border:1px solid #ccc"><source src="${videoUrl}" type="video/mp4"></video>`;
      xblockVideo = videoContainer.querySelector("#xblockVideo");

      xblockVideo.addEventListener("play", () => xblockVideoPlayingStatus.textContent = "Yes");
      xblockVideo.addEventListener("pause", () => xblockVideoPlayingStatus.textContent = "No");
      xblockVideo.addEventListener("ended", () => xblockVideoPlayingStatus.textContent = "No (Ended)");

      xblockVideo.addEventListener("timeupdate", () => {
        currentTime = xblockVideo.currentTime;
        const mins = Math.floor(currentTime / 60);
        const secs = Math.floor(currentTime % 60).toString().padStart(2, "0");
        xblockVideoTimeStatus.textContent = `${mins}:${secs}`;
      });
    }
  }

  async function loadModels() {
    try {
      xblockModelLoadStatus.textContent = "Loading models...";
      const modelUri = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";
      await faceapi.nets.tinyFaceDetector.loadFromUri(modelUri);
      modelsLoaded = true;
      xblockModelLoadStatus.textContent = "Models Loaded ✅";
      console.log("✅ Face-API models loaded");
      startWebcam();
    } catch (error) {
      console.error("❌ Error loading models:", error);
      xblockModelLoadStatus.textContent = "Error loading models. See console.";
    }
  }

  async function startWebcam() {
    if (!modelsLoaded || mediaStream) return;
    try {
      xblockWebcamStatus.textContent = "Requesting camera access...";
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      xblockWebcamVideo.srcObject = mediaStream;
      xblockWebcamVideo.onloadedmetadata = () => {
        xblockWebcamVideo.play();
        xblockWebcamStatus.textContent = "Webcam On ✅";
        startFaceDetection();
      };
    } catch (err) {
      console.error("❌ Webcam error:", err);
      xblockWebcamStatus.textContent = `Error: ${err.name}`;
    }
  }

  function startFaceDetection() {
    if (!modelsLoaded || !mediaStream || faceDetectionInterval) return;
    faceDetectionInterval = setInterval(async () => {
      if (xblockWebcamVideo.paused || xblockWebcamVideo.ended) return;
      const displaySize = {
        width: xblockWebcamVideo.videoWidth,
        height: xblockWebcamVideo.videoHeight,
      };
      faceapi.matchDimensions(xblockFaceDetectionCanvas, displaySize);
      const detections = await faceapi.detectAllFaces(xblockWebcamVideo, new faceapi.TinyFaceDetectorOptions());
      const faceDetected = detections.length > 0;
      xblockFaceDetectedStatus.textContent = faceDetected ? "Yes ✅" : "No ❌";

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const ctx = xblockFaceDetectionCanvas.getContext("2d");
      ctx.clearRect(0, 0, xblockFaceDetectionCanvas.width, xblockFaceDetectionCanvas.height);
      faceapi.draw.drawDetections(xblockFaceDetectionCanvas, resizedDetections);

      sendTrackingData(faceDetected);
    }, detectionIntervalTime);
  }

  document.addEventListener("visibilitychange", () => {
    isTabActive = !document.hidden;
    xblockTabActiveStatus.textContent = isTabActive ? "Yes" : "No";
    if (xblockVideo && document.hidden && !xblockVideo.paused) {
      xblockVideo.pause();
      xblockVideoPlayingStatus.textContent = "No (Tab Hidden)";
    }
  });

  function sendTrackingData(faceDetected) {
    if (!mediaStream || !isTabActive || !faceDetected) return;
    const payload = {
      currentTime: currentTime,
      isPlaying: true,
      isTabActive: true,
      faceDetected: true,
    };
    $.ajax({
      type: "POST",
      url: trackEventHandlerUrl,
      data: JSON.stringify(payload),
      contentType: "application/json; charset=utf-8",
      dataType: "json",
      success: function (response) {
        if (response.total_watch_time !== undefined) {
          xblockTimeWatched.textContent = `${Math.round(response.total_watch_time)}s`;
        }
        console.log("✅ Data sent:", response);
      },
      error: function (xhr) {
        console.error("❌ Error sending data:", xhr.responseText);
      },
    });
  }

  setupVideoElement();
  loadModels();
};
