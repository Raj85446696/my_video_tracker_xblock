from setuptools import setup

setup(
    name='my_video_tracker_xblock',
    version='0.1',
    description='An XBlock that tracks video engagement.',
    packages=['my_video_tracker_xblock'],
    install_requires=[
        "opencv-python",
        "numpy",
        "Pillow",
        "requests",
        "web-fragments",
        "xblock"
    ],
    entry_points={
        'xblock.v1': [
            'my_video_tracker_xblock = my_video_tracker_xblock.video_tracker:VideoEngagementXBlock',
        ]
    },
)
