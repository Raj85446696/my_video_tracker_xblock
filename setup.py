from setuptools import setup

setup(
    name='my_video_tracker_xblock',
    version='0.1',
    description='An Open edX XBlock for tracking video engagement with face detection and YouTube integration.',
    packages=['my_video_tracker_xblock'],
    install_requires=[
        'XBlock',
        'web-fragments',
        'requests',
    ],
    entry_points={
        'xblock.v1': [
            'my_video_tracker_xblock = my_video_tracker_xblock.video_engagement_xblock:VideoEngagementXBlock',
        ],
    },
    package_data={
        'my_video_tracker_xblock': [
            'static/css/*.css',
            'static/js/*.js',
            'static/html/*.html',
        ],
    },
    zip_safe=False,
)
