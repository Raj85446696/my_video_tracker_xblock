import pkg_resources
from web_fragments.fragment import Fragment
from xblock.core import XBlock
from xblock.fields import Scope, String, Float, Boolean
import json
import logging

log = logging.getLogger(__name__)

# This line is crucial for accessing user information within the XBlock
@XBlock.needs("user")
class VideoEngagementXBlock(XBlock):
    """
    An XBlock that tracks video engagement and performs client-side face detection.
    """

    # XBlock Fields for configuration and state
    display_name = String(
        default="Video Engagement Tracker",
        scope=Scope.settings, # Editable in Studio
        help="Display name for the XBlock in the Studio."
    )

    video_url = String(
        default="https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4",
        scope=Scope.content, # Editable in Studio, specific to this XBlock instance
        help="URL of the video to be displayed and tracked."
    )

    # Fields to store aggregated user-specific data (persisted by Open edX)
    # In a real production system, this data would typically be sent to a
    # dedicated analytics database or a custom Django model for robust storage.
    last_tracked_time = Float(
        default=0.0,
        scope=Scope.user_state, # User-specific state, persisted
        help="Last video time reported by the user for this video."
    )
    total_watch_time = Float(
        default=0.0,
        scope=Scope.user_state,
        help="Total accumulated watch time for this user on this video."
    )
    # You can add more fields here to store other metrics like:
    # total_tab_changes = Integer(default=0, scope=Scope.user_state, help="Number of times user changed tab.")
    # total_face_detections = Integer(default=0, scope=Scope.user_state, help="Total count of face detections.")

    def resource_string(self, path):
        """Handy helper for getting resources from our kit."""
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    def student_view(self, context=None):
        """
        The main view for students. This renders the HTML and loads the JavaScript.
        """
        html = self.resource_string("static/html/my_video_tracker_xblock.html")
        frag = Fragment(html.format(video_url=self.video_url))

        # Add CSS
        frag.add_css(self.resource_string("static/css/my_video_tracker_xblock.css"))

        # Add JavaScript
        frag.add_javascript(self.resource_string("static/js/my_video_tracker_xblock.js"))

        # Initialize the JavaScript with necessary data
        # The 'data' dictionary is passed to the JavaScript's initialization function.
        frag.initialize_js(
            function_name="VideoEngagementXBlockInit",
            data={
                "videoUrl": self.video_url,
                # Generate a URL for the 'track_event' handler.
                # The .replace('//', '/') is a common workaround for some Open edX URL quirks.
                "trackEventHandlerUrl": self.runtime.handler_url(self, 'track_event').replace('//', '/'),
                # Get the current user's username. This requires @XBlock.needs("user")
                "userId": self.runtime.service(self, "user").get_current_user().opt_attrs['edx-platform.username'],
            }
        )
        return frag

    @XBlock.json_handler
    def track_event(self, data, suffix=''):
        """
        A handler that receives tracking data from the frontend.
        Data will be a JSON object sent from the JavaScript.
        """
        user_service = self.runtime.service(self, "user")
        user = user_service.get_current_user()
        user_id = user.opt_attrs['edx-platform.username'] if user else "anonymous"

        log.info(f"Received tracking data from user {user_id} for video '{self.video_url}': {json.dumps(data)}")

        # Example: Update XBlock state based on received data
        # This demonstrates persisting data per user within the XBlock's state.
        # For production, consider a dedicated database or analytics service.
        current_time = data.get('currentTime', 0.0)
        is_playing = data.get('isPlaying', False)
        is_tab_active = data.get('isTabActive', True)
        face_detected = data.get('faceDetected', False)

        # Accumulate watch time only if video is playing and tab is active
        if is_playing and is_tab_active:
            # Prevent large jumps in time (e.g., if user seeks or refreshes)
            time_diff = current_time - self.last_tracked_time
            if 0 < time_diff < 5: # Only add small, positive increments
                self.total_watch_time += time_diff
            self.last_tracked_time = current_time
        else:
            # If not playing or tab inactive, just update last tracked time
            self.last_tracked_time = current_time


        log.info(f"User {user_id} - Video: {self.video_url}, Current Time: {current_time:.2f}s, "
                 f"Playing: {is_playing}, Tab Active: {is_tab_active}, Face Detected: {face_detected}, "
                 f"Total Watch Time: {self.total_watch_time:.2f}s")

        # You could also store 'face_detected' status in a field if needed
        # self.last_face_detected_status = face_detected

        return {"status": "success", "message": "Data received and processed.", "total_watch_time": self.total_watch_time}

    def studio_view(self, context=None):
        """
        The view for authors in Open edX Studio.
        Allows configuration of the video URL and display name.
        """
        html = self.resource_string("static/html/my_video_tracker_xblock_edit.html")
        frag = Fragment(html.format(
            video_url=self.video_url,
            display_name=self.display_name
        ))
        frag.add_css(self.resource_string("static/css/my_video_tracker_xblock.css"))
        frag.add_javascript(self.resource_string("static/js/my_video_tracker_xblock_edit.js"))
        frag.initialize_js(
            function_name="VideoEngagementXBlockEditInit",
            data={
                "videoUrl": self.video_url,
                "displayName": self.display_name,
                "saveHandlerUrl": self.runtime.handler_url(self, 'save_settings').replace('//', '/'),
            }
        )
        return frag

    @XBlock.json_handler
    def save_settings(self, data, suffix=''):
        """
        Handles saving settings from the Studio view.
        """
        self.video_url = data.get('video_url', self.video_url)
        self.display_name = data.get('display_name', self.display_name)
        log.info(f"XBlock settings saved: video_url={self.video_url}, display_name={self.display_name}")
        return {"status": "success", "message": "Settings saved."}

    @staticmethod
    def workbench_scenarios():
        """
        A canned scenario for display in the XBlock workbench.
        Useful for local development and testing without a full Open edX instance.
        """
        return [
            ("Video Engagement Tracker (Default)",
             """<my_video_tracker_xblock/>
             """),
            ("Video Engagement Tracker (Custom Video)",
             """<my_video_tracker_xblock video_url="https://www.learningcontainer.com/wp-content/uploads/2020/07/Big-Buck-Bunny.mp4"/>
             """),
        ]

