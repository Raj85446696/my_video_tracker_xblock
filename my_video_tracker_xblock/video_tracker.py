from xblock.fields import Scope, String, Float
import pkg_resources
from web_fragments.fragment import Fragment
from xblock.core import XBlock
import json
import logging
import requests

log = logging.getLogger(__name__)

YOUTUBE_API_KEY = "AIzaSyC22yHC1Ja1uVifYqORH36AMlu3d_VKcp8"


@XBlock.needs("user")
class VideoEngagementXBlock(XBlock):
    video_id = String(default="default_video", scope=Scope.content)
    display_name = String(default="Video Engagement Tracker", scope=Scope.content)
    video_url = String(
        default="https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4",
        scope=Scope.content,
    )
    mode = String(default="student", scope=Scope.content)  # 👈 Added mode switch
    last_tracked_time = Float(default=0.0, scope=Scope.user_state)
    total_watch_time = Float(default=0.0, scope=Scope.user_state)

    def resource_string(self, path):
        return pkg_resources.resource_string(__name__, path).decode("utf8")

    # def student_view(self, context=None):
    #     # 👇 Conditionally render the studio view in workbench
    #     if self.mode == "studio":
    #         return self.studio_view(context)

    #     html_str = self.resource_string("static/html/my_video_tracker_xblock.html")
    #     html_str = html_str.replace("{video_url}", self.video_url)
    #     frag = Fragment(html_str)
    #     frag.add_css(self.resource_string("static/css/my_video_tracker_xblock.css"))
    #     frag.add_javascript(
    #         self.resource_string("static/js/my_video_tracker_xblock.js")
    #     )
    #     frag.initialize_js(
    #         "VideoEngagementXBlockInit",
    #         {
    #             "videoUrl": self.video_url,
    #             "trackEventHandlerUrl": self.runtime.handler_url(self, "track_event"),
    #             "userId": self.scope_ids.user_id,
    #         },
    #     )
    #     return frag

    def student_view(self, context=None):
        if self.mode == "studio":
            return self.studio_view(context)

        html_str = self.resource_string("static/html/my_video_tracker_xblock.html")
        html_str = html_str.replace("{video_url}", self.video_url)
        html_str = html_str.replace(
            "{display_name}", self.display_name
        )  # 👈 Add this line
        frag = Fragment(html_str)
        frag.add_css(self.resource_string("static/css/my_video_tracker_xblock.css"))
        frag.add_javascript(
            self.resource_string("static/js/my_video_tracker_xblock.js")
        )
        frag.initialize_js(
            "VideoEngagementXBlockInit",
            {
                "videoUrl": self.video_url,
                "trackEventHandlerUrl": self.runtime.handler_url(self, "track_event"),
                "userId": self.scope_ids.user_id,
            },
        )

        return frag

    @XBlock.json_handler
    def track_event(self, data, suffix=""):
        user_service = self.runtime.service(self, "user")
        user = user_service.get_current_user()
        user_id = (
            user.opt_attrs.get("edx-platform.username", "anonymous")
            if user
            else "anonymous"
        )
        current_time = data.get("currentTime", 0.0)
        if data.get("isPlaying") and data.get("isTabActive"):
            time_diff = current_time - self.last_tracked_time
            if 0 < time_diff < 5:
                self.total_watch_time += time_diff
            self.last_tracked_time = current_time
        else:
            self.last_tracked_time = current_time
        log.info(
            f"User {user_id} - Time: {current_time:.2f}s, Watch Time: {self.total_watch_time:.2f}s"
        )
        return {"status": "success", "total_watch_time": self.total_watch_time}

    def studio_view(self, context=None):
        html_str = self.resource_string("static/html/my_video_tracker_xblock_edit.html")
        try:
            html_str = html_str.format(
                video_url=self.video_url or "", display_name=self.display_name or ""
            )
        except KeyError as e:
            log.error(f"Missing placeholder in edit.html: {e}")
            html_str = "<p>Error rendering editor view: missing placeholder</p>"

        frag = Fragment(html_str)
        frag.add_css(self.resource_string("static/css/my_video_tracker_xblock.css"))
        frag.add_javascript(
            self.resource_string("static/js/my_video_tracker_xblock_edit.js")
        )
        frag.initialize_js("MyVideoTrackerXBlockEdit")
        return frag

    @XBlock.json_handler
    def save_settings(self, data, suffix=""):
        self.video_url = data.get("video_url", self.video_url)
        self.display_name = data.get("display_name", self.display_name)
        log.info(
            f"Saved settings: video_url={self.video_url}, display_name={self.display_name}"
        )
        return {"status": "success", "message": "Settings saved."}

    @XBlock.json_handler
    def get_youtube_metadata(self, data, suffix=""):
        video_id = data.get("id")
        if not video_id:
            return {"status": "error", "message": "Missing video ID"}
        try:
            response = requests.get(
                "https://www.googleapis.com/youtube/v3/videos",
                params={
                    "id": video_id,
                    "part": "snippet,contentDetails,statistics",
                    "key": YOUTUBE_API_KEY,
                },
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
            ("Video Engagement Tracker (Default)", "<my_video_tracker_xblock/>"),
            (
                "Video Engagement Tracker (Custom Video)",
                '<my_video_tracker_xblock display_name="UCB Webcast" video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"/>',
            ),
            (
                "Video Engagement Tracker (Studio View)",
                '<my_video_tracker_xblock mode="studio"/>',
            ),
        ]
