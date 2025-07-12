"""Setup for my_video_tracker_xblock."""

import os
from pathlib import Path
from setuptools import find_packages, setup

this_directory = Path(__file__).parent
long_description = (this_directory / "README.md").read_text() if (this_directory / "README.md").exists() else ""

def package_data(pkg, roots):
    """Generic function to find package_data."""
    data = []
    for root in roots:
        for dirname, _, files in os.walk(os.path.join(pkg, root)):
            for fname in files:
                data.append(os.path.relpath(os.path.join(dirname, fname), pkg))
    return {pkg: data}


setup(
    name='my-video-tracker-xblock',
    version='0.1.0',
    description="Custom video tracker XBlock for Open edX",
    long_description=long_description,
    long_description_content_type='text/markdown',
    url='https://github.com/yourname/my-video-tracker-xblock',
    license='AGPL v3',
    author='Rahul',
    packages=find_packages(
        include=['my_video_tracker', 'my_video_tracker.*'],
        exclude=["*tests"],
    ),
    install_requires=[
        'XBlock',
        'xblock-utils',
    ],
    entry_points={
        'xblock.v1': [
            'my_video_tracker = my_video_tracker:MyVideoTrackerXBlock',
        ]
    },
    package_data=package_data("my_video_tracker", ["static", "public"]),
)
