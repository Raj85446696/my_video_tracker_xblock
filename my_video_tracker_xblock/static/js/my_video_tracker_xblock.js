function VideoEngagementXBlockInit(runtime, element, data) {
    // --- 1. DOM Element Selection ---
    // Get all the interactive and status elements from the HTML.
    const xblockVideo = element.querySelector('#xblockVideo');
    const xblockWebcamVideo = element.querySelector('#xblockWebcamVideo');
    const xblockFaceDetectionCanvas = element.querySelector('#xblockFaceDetectionCanvas');

    // Status indicators
    const xblockModelLoadStatus = element.querySelector('#xblockModelLoadStatus');
    const xblockWebcamStatus = element.querySelector('#xblockWebcamStatus');
    const xblockVideoPlayingStatus = element.querySelector('#xblockVideoPlayingStatus');
    const xblockVideoTimeStatus = element.querySelector('#xblockVideoTimeStatus');
    const xblockTabActiveStatus = element.querySelector('#xblockTabActiveStatus');
    const xblockFaceDetectedStatus = element.querySelector('#xblockFaceDetectedStatus');
    const xblockTimeWatched = element.querySelector('#xblockTimeWatched');

    // Buttons
    const xblockStartWebcamBtn = element.querySelector('#xblockStartWebcamBtn');
    const xblockStopWebcamBtn = element.querySelector('#xblockStopWebcamBtn');

    // --- 2. Data and State Initialization ---
    // Data passed from the Python XBlock backend
    const videoUrl = data.videoUrl;
    const trackEventHandlerUrl = data.trackEventHandlerUrl; // This is the URL for our 'track_event' handler
    const userId = data.userId;

    // State variables
    let isTabActive = true;
    let faceDetectionInterval = null;
    let mediaStream = null;
    let modelsLoaded = false;
    const detectionIntervalTime = 3000; // Milliseconds between each face detection check and data log

    // Set the video source from the XBlock data
    xblockVideo.src = videoUrl;

    // --- 3. Core Logic: Model Loading, Webcam, and Face Detection ---

    /**
     * Loads the required face-api.js models from a CDN.
     * Updates the UI to show the loading status.
     */
    async function loadModels() {
        try {
            xblockModelLoadStatus.textContent = "Loading models...";
            // Using a pinned version of face-api.js for stability
            const modelUri = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';
            await faceapi.nets.tinyFaceDetector.loadFromUri(modelUri);
            modelsLoaded = true;
            xblockModelLoadStatus.textContent = "Models Loaded ✅";
            console.log('VideoEngagementXBlock: Face-API.js models loaded successfully.');
        } catch (error) {
            modelsLoaded = false;
            console.error('VideoEngagementXBlock: Error loading face-api.js models:', error);
            xblockModelLoadStatus.textContent = "Error loading models. See console.";
        }
    }

    /**
     * Starts the user's webcam and begins the face detection process.
     */
    async function startWebcam() {
        if (!modelsLoaded) {
            xblockWebcamStatus.textContent = "Models are not loaded yet. Please wait.";
            return;
        }
        if (mediaStream) {
            console.log("VideoEngagementXBlock: Webcam is already running.");
            return;
        }
        try {
            xblockWebcamStatus.textContent = "Requesting camera access...";
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            xblockWebcamVideo.srcObject = mediaStream;
            xblockWebcamVideo.onloadedmetadata = () => {
                xblockWebcamVideo.play();
                xblockWebcamStatus.textContent = "Webcam On ✅";
                console.log('VideoEngagementXBlock: Webcam started.');
                startFaceDetection(); // Begin detection once the webcam is running
            };
        } catch (err) {
            console.error("VideoEngagementXBlock: Error accessing webcam:", err);
            xblockWebcamStatus.textContent = `Error: ${err.name}. Please allow camera access.`;
        }
    }

    /**
     * Stops the webcam feed and clears the face detection interval.
     */
    function stopWebcam() {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            xblockWebcamVideo.srcObject = null;
            mediaStream = null;
            clearInterval(faceDetectionInterval);
            faceDetectionInterval = null;

            // Reset UI
            xblockFaceDetectedStatus.textContent = "N/A";
            xblockWebcamStatus.textContent = "Webcam Off";
            const context = xblockFaceDetectionCanvas.getContext('2d');
            context.clearRect(0, 0, xblockFaceDetectionCanvas.width, xblockFaceDetectionCanvas.height);
            console.log('VideoEngagementXBlock: Webcam stopped.');
        }
    }

    /**
     * Sets up a recurring interval to detect faces from the webcam feed.
     */
    function startFaceDetection() {
        if (!modelsLoaded || !mediaStream || faceDetectionInterval) return;

        faceDetectionInterval = setInterval(async () => {
            if (xblockWebcamVideo.paused || xblockWebcamVideo.ended) return;

            const displaySize = { width: xblockWebcamVideo.videoWidth, height: xblockWebcamVideo.videoHeight };
            faceapi.matchDimensions(xblockFaceDetectionCanvas, displaySize);

            const detections = await faceapi.detectAllFaces(xblockWebcamVideo, new faceapi.TinyFaceDetectorOptions());
            const faceDetected = detections.length > 0;

            // Update UI status
            xblockFaceDetectedStatus.textContent = faceDetected ? "Yes ✅" : "No ❌";

            // Draw detection boxes on the canvas for visual feedback
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            const context = xblockFaceDetectionCanvas.getContext('2d');
            context.clearRect(0, 0, xblockFaceDetectionCanvas.width, xblockFaceDetectionCanvas.height);
            faceapi.draw.drawDetections(xblockFaceDetectionCanvas, resizedDetections);

            // Send the latest data to the backend
            sendTrackingData(faceDetected);

        }, detectionIntervalTime);
    }

    // --- 4. Event Listeners ---

    // Listen for main video playback events
    xblockVideo.addEventListener('play', () => {
        xblockVideoPlayingStatus.textContent = "Yes";
    });

    xblockVideo.addEventListener('pause', () => {
        xblockVideoPlayingStatus.textContent = "No";
        sendTrackingData(xblockFaceDetectedStatus.textContent.startsWith("Yes")); // Send data on manual pause
    });

    xblockVideo.addEventListener('ended', () => {
        xblockVideoPlayingStatus.textContent = "No (Ended)";
        sendTrackingData(xblockFaceDetectedStatus.textContent.startsWith("Yes")); // Send data when video finishes
    });

    xblockVideo.addEventListener('timeupdate', () => {
        const minutes = Math.floor(xblockVideo.currentTime / 60);
        const seconds = Math.floor(xblockVideo.currentTime % 60).toString().padStart(2, '0');
        xblockVideoTimeStatus.textContent = `${minutes}:${seconds}`;
    });

    // Listen for tab visibility changes
    document.addEventListener('visibilitychange', () => {
        isTabActive = !document.hidden;
        xblockTabActiveStatus.textContent = isTabActive ? "Yes" : "No";
        console.log(`VideoEngagementXBlock: Tab visibility changed to: ${isTabActive ? 'Active' : 'Hidden'}`);

        // Automatically pause the video if the user switches tabs
        if (document.hidden && !xblockVideo.paused) {
            xblockVideo.pause();
            xblockVideoPlayingStatus.textContent = "No (Tab Hidden)";
        }
        // Send an immediate update when visibility changes
        sendTrackingData(xblockFaceDetectedStatus.textContent.startsWith("Yes"));
    });

    // Listen for button clicks
    xblockStartWebcamBtn.addEventListener('click', startWebcam);
    xblockStopWebcamBtn.addEventListener('click', stopWebcam);


    // --- 5. Backend Communication ---

    /**
     * Sends tracking data to the Python backend using a standard AJAX POST request.
     * @param {boolean} faceDetected - The current status of face detection.
     */
    function sendTrackingData(faceDetected) {
        // Only send data if the webcam is active and has determined a face status
        if (!mediaStream) {
            return;
        }

        const dataToSend = {
            currentTime: xblockVideo.currentTime,
            isPlaying: !xblockVideo.paused && !xblockVideo.ended,
            isTabActive: isTabActive,
            faceDetected: faceDetected,
        };

        // Use jQuery's ajax, which is standard in the Open edX platform.
        $.ajax({
            type: "POST",
            url: trackEventHandlerUrl, // The URL to the 'track_event' handler
            data: JSON.stringify(dataToSend),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function(response) {
                console.log('VideoEngagementXBlock: Data sent successfully. Response:', response);
                // Update the "Total Time Watched" display with the value from the server
                if (response.total_watch_time !== undefined) {
                    xblockTimeWatched.textContent = `${Math.round(response.total_watch_time)}s`;
                }
            },
            error: function(xhr, status, error) {
                console.error('VideoEngagementXBlock: Error sending data:', xhr.responseText);
            }
        });
    }

    // --- 6. Initial Call ---
    // Start the process by loading the face detection models as soon as the XBlock is loaded.
    loadModels();
}