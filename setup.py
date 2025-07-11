from setuptools import setup, find_packages
import os

long_description = ''
if os.path.exists('README.md'):
    with open('README.md', encoding='utf-8') as f:
        long_description = f.read()

setup(
    name='my-video-tracker-xblock',
    version='0.1',
    description='A video engagement tracking XBlock for Open edX with client-side face detection.',
    long_description=long_description,
    long_description_content_type='text/markdown',
    author='Ritu Raj Kumar',
    author_email='riturajkumar8544@gmail.com',
    url='https://github.com/Raj85446696/my_video_tracker_xblock',
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        'XBlock',
        'xblock-utils',
        'web-fragments',
    ],
    entry_points={
        'xblock.v1': [
            'my_video_tracker_xblock = my_video_tracker_xblock:VideoEngagementXBlock',
        ],
    },
    classifiers=[
        'Programming Language :: Python :: 3',
        'License :: OSI Approved :: Apache Software License',
        'Operating System :: OS Independent',
        'Framework :: Open edX',
    ],
    zip_safe=False,
)
