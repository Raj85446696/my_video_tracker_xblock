window.VideoEngagementXBlockInit = function (runtime, element, data) {
  const videoUrl = data.videoUrl;
  const trackEventHandlerUrl = data.trackEventHandlerUrl;

  const xblockWebcamVideo = element.querySelector("#xblockWebcamVideo");
  const xblockVideoPlayingStatus = element.querySelector(
    "#xblockVideoPlayingStatus"
  );
  const xblockVideoTimeStatus = element.querySelector("#xblockVideoTimeStatus");
  const xblockTabActiveStatus = element.querySelector("#xblockTabActiveStatus");
  const xblockFaceDetectedStatus = element.querySelector(
    "#xblockFaceDetectedStatus"
  );
  const xblockTimeWatched = element.querySelector("#xblockTimeWatched");
  const xblockWebcamStatus = element.querySelector("#xblockWebcamStatus");

  let currentTime = 0;
  let mediaStream = null;
  let isTabActive = true;
  let xblockVideo = null;

  function setupVideoElement() {
    const videoContainer = element.querySelector("#videoContainer");
    videoContainer.innerHTML = `<video id="xblockVideo" width="640" height="360" controls style="border:1px solid #ccc">
                                  <source src="${videoUrl}" type="video/mp4">
                                </video>`;
    xblockVideo = videoContainer.querySelector("#xblockVideo");

    xblockVideo.addEventListener(
      "play",
      () => (xblockVideoPlayingStatus.textContent = "Yes")
    );
    xblockVideo.addEventListener(
      "pause",
      () => (xblockVideoPlayingStatus.textContent = "No")
    );
    xblockVideo.addEventListener("timeupdate", () => {
      currentTime = xblockVideo.currentTime;
      const mins = Math.floor(currentTime / 60);
      const secs = Math.floor(currentTime % 60)
        .toString()
        .padStart(2, "0");
      xblockVideoTimeStatus.textContent = `${mins}:${secs}`;
    });
  }

  async function startWebcam() {
    try {
      // ✅ Smart check: if getUserMedia is undefined, exit early with a helpful message
      if (
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        xblockWebcamStatus.textContent =
          "❌ Camera not supported or blocked (insecure context or iframe).";
        console.warn(
          "getUserMedia is not available — likely due to insecure context (not HTTPS) or iframe sandboxing."
        );
        return;
      }

      xblockWebcamStatus.textContent = "Requesting camera access...";

      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      xblockWebcamVideo.srcObject = mediaStream;

      xblockWebcamVideo.onloadedmetadata = () => {
        xblockWebcamVideo.play();
        xblockWebcamStatus.textContent = "✅ Webcam On";
        setInterval(captureAndSendFrame, 4000);
      };
    } catch (err) {
      let message = "Webcam Error: " + err.name;
      if (err.name === "NotAllowedError") {
        message = "❌ Camera permission denied.";
      } else if (err.name === "NotFoundError") {
        message = "❌ No webcam device found.";
      }
      xblockWebcamStatus.textContent = message;
      console.error(message, err);
    }
  }

  function captureAndSendFrame() {
    const canvas = document.createElement("canvas");
    canvas.width = xblockWebcamVideo.videoWidth;
    canvas.height = xblockWebcamVideo.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(xblockWebcamVideo, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/jpeg");

    const payload = {
      image: imageData,
      currentTime: currentTime,
      isPlaying: !xblockVideo.paused,
      isTabActive: isTabActive,
    };

    $.ajax({
      type: "POST",
      url: trackEventHandlerUrl,
      data: JSON.stringify(payload),
      contentType: "application/json",
      dataType: "json",
      success: function (res) {
        xblockFaceDetectedStatus.textContent = res.face_detected
          ? "Yes ✅"
          : "No ❌";
        xblockTimeWatched.textContent = `${Math.round(res.total_watch_time)}s`;
      },
      error: function (xhr) {
        console.error("❌ Error sending data:", xhr.responseText);
      },
    });
  }

  document.addEventListener("visibilitychange", () => {
    isTabActive = !document.hidden;
    xblockTabActiveStatus.textContent = isTabActive ? "Yes" : "No";
    if (xblockVideo && document.hidden && !xblockVideo.paused) {
      xblockVideo.pause();
      xblockVideoPlayingStatus.textContent = "No (Tab Hidden)";
    }
  });

  setupVideoElement();
  startWebcam();
};
