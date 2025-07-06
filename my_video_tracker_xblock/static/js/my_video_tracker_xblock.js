/*
 * This is the frontend JavaScript for the VideoEngagementXBlock.
 * It handles video playback, webcam access, face detection using face-api.js,
 * and sending tracking data to the XBlock's Python backend.
 */

function VideoEngagementXBlockInit(runtime, element, data) {
    const xblockVideo = element.querySelector('#xblockVideo');
    const xblockWebcamVideo = element.querySelector('#xblockWebcamVideo');
    const xblockFaceDetectionCanvas = element.querySelector('#xblockFaceDetectionCanvas');
    const xblockWebcamStatus = element.querySelector('#xblockWebcamStatus');
    const xblockModelLoadStatus = element.querySelector('#xblockModelLoadStatus');

    const xblockPlayVideoBtn = element.querySelector('#xblockPlayVideoBtn');
    const xblockPauseVideoBtn = element.querySelector('#xblockPauseVideoBtn');
    const xblockStartWebcamBtn = element.querySelector('#xblockStartWebcamBtn');
    const xblockStopWebcamBtn = element.querySelector('#xblockStopWebcamBtn');

    const xblockVideoPlayingStatus = element.querySelector('#xblockVideoPlayingStatus');
    const xblockVideoTimeStatus = element.querySelector('#xblockVideoTimeStatus');
    const xblockTabActiveStatus = element.querySelector('#xblockTabActiveStatus');
    const xblockFaceDetectedStatus = element.querySelector('#xblockFaceDetectedStatus');

    // Data passed from Python XBlock
    const videoUrl = data.videoUrl;
    const trackEventHandlerUrl = data.trackEventHandlerUrl;
    const userId = data.userId;

    let isTabActive = true;
    let faceDetectionInterval = null;
    let mediaStream = null;
    let modelsLoaded = false;
    const detectionIntervalTime = 2000; // Milliseconds for face detection and data logging

    // Set the video source from XBlock data
    xblockVideo.src = videoUrl;

    // --- Face-API.js Model Loading ---
    async function loadModels() {
        try {
            xblockModelLoadStatus.textContent = "Loading face detection models (this may take a moment)...";
            // Ensure models are loaded from a reliable source or self-hosted
            await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights');
            await faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights');
            // await faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights'); // Not strictly needed for just detection
            modelsLoaded = true;
            xblockModelLoadStatus.textContent = "Face detection models loaded!";
            console.log('VideoEngagementXBlock: Face-API.js models loaded successfully.');
        } catch (error) {
            console.error('VideoEngagementXBlock: Error loading face-api.js models:', error);
            xblockModelLoadStatus.textContent = "Error loading models. Check console.";
        }
    }

    // --- Webcam Control ---
    async function startWebcam() {
        if (!modelsLoaded) {
            xblockWebcamStatus.textContent = "Models not loaded yet. Please wait.";
            return;
        }
        if (mediaStream) {
            console.log("VideoEngagementXBlock: Webcam already running.");
            return;
        }
        try {
            xblockWebcamStatus.textContent = "Starting webcam...";
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            xblockWebcamVideo.srcObject = mediaStream;
            xblockWebcamVideo.onloadedmetadata = () => {
                xblockWebcamVideo.play();
                // Match canvas dimensions to video stream
                xblockFaceDetectionCanvas.width = xblockWebcamVideo.videoWidth;
                xblockFaceDetectionCanvas.height = xblockWebcamVideo.videoHeight;
                xblockWebcamStatus.textContent = ""; // Clear status once video is playing
                console.log('VideoEngagementXBlock: Webcam started.');
                startFaceDetection();
            };
        } catch (err) {
            console.error("VideoEngagementXBlock: Error accessing webcam:", err);
            xblockWebcamStatus.textContent = `Error: ${err.name}. Please allow camera access.`;
        }
    }

    function stopWebcam() {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            xblockWebcamVideo.srcObject = null;
            mediaStream = null;
            clearInterval(faceDetectionInterval);
            faceDetectionInterval = null;
            xblockFaceDetectedStatus.textContent = "No";
            xblockWebcamStatus.textContent = "Webcam stopped.";
            const context = xblockFaceDetectionCanvas.getContext('2d');
            context.clearRect(0, 0, xblockFaceDetectionCanvas.width, xblockFaceDetectionCanvas.height); // Clear canvas
            console.log('VideoEngagementXBlock: Webcam stopped.');
        }
    }

    // --- Face Detection Logic ---
    async function startFaceDetection() {
        if (!modelsLoaded || !mediaStream) return;

        const displaySize = { width: xblockWebcamVideo.videoWidth, height: xblockWebcamVideo.videoHeight };
        faceapi.matchDimensions(xblockFaceDetectionCanvas, displaySize);

        faceDetectionInterval = setInterval(async () => {
            if (!xblockWebcamVideo.paused && !xblockWebcamVideo.ended) {
                const detections = await faceapi.detectAllFaces(xblockWebcamVideo, new faceapi.TinyFaceDetectorOptions());
                const resizedDetections = faceapi.resizeResults(detections, displaySize);
                const context = xblockFaceDetectionCanvas.getContext('2d');
                context.clearRect(0, 0, xblockFaceDetectionCanvas.width, xblockFaceDetectionCanvas.height);
                faceapi.draw.drawDetections(xblockFaceDetectionCanvas, resizedDetections);

                const faceDetected = resizedDetections.length > 0;
                xblockFaceDetectedStatus.textContent = faceDetected ? "Yes" : "No";

                // Send data to backend
                sendTrackingData(faceDetected);
            }
        }, detectionIntervalTime);
    }

    // --- Video Playback Control ---
    xblockPlayVideoBtn.addEventListener('click', () => {
        xblockVideo.play();
        xblockVideoPlayingStatus.textContent = "Yes";
    });

    xblockPauseVideoBtn.addEventListener('click', () => {
        xblockVideo.pause();
        xblockVideoPlayingStatus.textContent = "No";
        sendTrackingData(xblockFaceDetectedStatus.textContent === "Yes"); // Send data on manual pause
    });

    xblockVideo.addEventListener('play', () => {
        xblockVideoPlayingStatus.textContent = "Yes";
        // Start sending data more frequently when video plays
        if (!faceDetectionInterval && modelsLoaded && mediaStream) {
            startFaceDetection();
        }
    });

    xblockVideo.addEventListener('pause', () => {
        xblockVideoPlayingStatus.textContent = "No";
        sendTrackingData(xblockFaceDetectedStatus.textContent === "Yes"); // Send data on auto-pause/end
    });

    xblockVideo.addEventListener('timeupdate', () => {
        const minutes = Math.floor(xblockVideo.currentTime / 60);
        const seconds = Math.floor(xblockVideo.currentTime % 60).toString().padStart(2, '0');
        xblockVideoTimeStatus.textContent = `${minutes}:${seconds}`;
    });

    xblockVideo.addEventListener('ended', () => {
        xblockVideoPlayingStatus.textContent = "No (Ended)";
        sendTrackingData(xblockFaceDetectedStatus.textContent === "Yes"); // Send data when video ends
    });

    // --- Tab Change Detection ---
    document.addEventListener('visibilitychange', () => {
        isTabActive = !document.hidden;
        xblockTabActiveStatus.textContent = isTabActive ? "Yes" : "No";
        console.log(`VideoEngagementXBlock: Tab visibility changed: ${isTabActive ? 'Active' : 'Hidden'}`);
        sendTrackingData(xblockFaceDetectedStatus.textContent === "Yes"); // Send data on visibility change

        // Pause video if tab is hidden
        if (document.hidden && !xblockVideo.paused) {
            xblockVideo.pause();
            xblockVideoPlayingStatus.textContent = "No (Tab Hidden)";
        }
    });

    // --- Send Data to XBlock Backend Handler ---
    function sendTrackingData(faceDetected) {
        const dataToSend = {
            timestamp: new Date().toISOString(),
            videoUrl: xblockVideo.src,
            currentTime: xblockVideo.currentTime,
            isPlaying: !xblockVideo.paused && !xblockVideo.ended,
            isTabActive: isTabActive,
            faceDetected: faceDetected,
            userId: userId // User ID from XBlock initialization data
        };

        // Use the XBlock runtime to make the AJAX call to the Python handler
        runtime.ajax(
            'track_event', // The name of the handler method in Python
            dataToSend,    // The data to send
            {
                success: function(response) {
                    console.log('VideoEngagementXBlock: Data sent successfully:', response);
                },
                error: function(xhr, status, error) {
                    console.error('VideoEngagementXBlock: Error sending data:', error);
                }
            }
        );
    }

    // --- Event Listeners for buttons ---
    xblockStartWebcamBtn.addEventListener('click', startWebcam);
    xblockStopWebcamBtn.addEventListener('click', stopWebcam);

    // Initial setup: Load models when the XBlock is initialized
    loadModels();
}
