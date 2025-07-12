import pkg_resources
from web_fragments.fragment import Fragment
from xblock.core import XBlock
from xblock.fields import Scope, String, Float
import json
import logging
import requests

log = logging.getLogger(__name__)

YOUTUBE_API_KEY = "AIzaSyC22yHC1Ja1uVifYqORH36AMlu3d_VKcp8"  # ✅ Your actual API key

@XBlock.needs("user")
class VideoEngagementXBlock(XBlock):
    display_name = String(
        default="Video Engagement Tracker",
        scope=Scope.settings,
        help="Display name for the XBlock in the Studio."
    )

    video_url = String(
        default="https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4",
        scope=Scope.content,
        help="URL of the video to be displayed and tracked."
    )

    last_tracked_time = Float(
        default=0.0,
        scope=Scope.user_state,
        help="Last video time reported by the user for this video."
    )

    total_watch_time = Float(
        default=0.0,
        scope=Scope.user_state,
        help="Total accumulated watch time for this user on this video."
    )

    def resource_string(self, path):
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    def student_view(self, context=None):
        html = self.resource_string("static/html/my_video_tracker_xblock.html")
        frag = Fragment(html.format(video_url=self.video_url))
        frag.add_css(self.resource_string("static/css/my_video_tracker_xblock.css"))
        frag.add_javascript(self.resource_string("static/js/my_video_tracker_xblock.js"))

        frag.initialize_js(data={
            "videoUrl": self.video_url,
            "trackEventHandlerUrl": self.runtime.handler_url(self, 'track_event').replace('//', '/'),
            "userId": self.runtime.service(self, "user").get_current_user().opt_attrs['edx-platform.username'],
        })
        return frag

    @XBlock.json_handler
    def track_event(self, data, suffix=''):
        user_service = self.runtime.service(self, "user")
        user = user_service.get_current_user()
        user_id = user.opt_attrs['edx-platform.username'] if user else "anonymous"

        current_time = data.get('currentTime', 0.0)
        is_playing = data.get('isPlaying', False)
        is_tab_active = data.get('isTabActive', True)
        face_detected = data.get('faceDetected', False)

        if is_playing and is_tab_active:
            time_diff = current_time - self.last_tracked_time
            if 0 < time_diff < 5:
                self.total_watch_time += time_diff
            self.last_tracked_time = current_time
        else:
            self.last_tracked_time = current_time

        log.info(f"User {user_id} - Video: {self.video_url}, Current Time: {current_time:.2f}s, "
                 f"Playing: {is_playing}, Tab Active: {is_tab_active}, Face Detected: {face_detected}, "
                 f"Total Watch Time: {self.total_watch_time:.2f}s")

        return {"status": "success", "message": "Data received and processed.", "total_watch_time": self.total_watch_time}

    def studio_view(self, context=None):
        html = self.resource_string("static/html/my_video_tracker_xblock_edit.html")
        frag = Fragment(html.format(
            video_url=self.video_url,
            display_name=self.display_name
        ))
        frag.add_css(self.resource_string("static/css/my_video_tracker_xblock.css"))
        frag.add_javascript(self.resource_string("static/js/my_video_tracker_xblock_edit.js"))
        frag.initialize_js(data={
            "videoUrl": self.video_url,
            "displayName": self.display_name,
            "saveHandlerUrl": self.runtime.handler_url(self, 'save_settings').replace('//', '/'),
        })
        return frag

    @XBlock.json_handler
    def save_settings(self, data, suffix=''):
        self.video_url = data.get('video_url', self.video_url)
        self.display_name = data.get('display_name', self.display_name)
        log.info(f"XBlock settings saved: video_url={self.video_url}, display_name={self.display_name}")
        return {"status": "success", "message": "Settings saved."}

    @XBlock.json_handler
    def get_youtube_metadata(self, data, suffix=''):
        """
        Fetch YouTube metadata for a given video ID using the YouTube API v3.
        Example: data = {"id": "2ePf9rue1Ao"}
        """
        video_id = data.get("id")
        if not video_id:
            return {"status": "error", "message": "Missing video ID"}

        try:
            response = requests.get(
                "https://www.googleapis.com/youtube/v3/videos",
                params={
                    "id": video_id,
                    "part": "snippet,contentDetails,statistics",
                    "key": YOUTUBE_API_KEY
                }
            )
            response.raise_for_status()
            metadata = response.json()

            if not metadata["items"]:
                return {"status": "error", "message": "No video found"}

            return {"status": "ok", "metadata": metadata["items"][0]}

        except requests.RequestException as e:
            log.error(f"YouTube API error: {str(e)}")
            return {"status": "error", "message": str(e)}

    @staticmethod
    def workbench_scenarios():
        return [
            ("Video Engagement Tracker (Default)",
             """<my_video_tracker_xblock/>"""),
            ("Video Engagement Tracker (Custom Video)",
             """<my_video_tracker_xblock video_url="https://www.learningcontainer.com/wp-content/uploads/2020/07/Big-Buck-Bunny.mp4"/>"""),
        ]
