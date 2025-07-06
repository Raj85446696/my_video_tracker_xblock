from setuptools import setup, find_packages

setup(
    name='my-video-tracker-xblock', # This is the unique name of your XBlock package
    version='0.1', # Version of your XBlock
    description='A video engagement tracking XBlock for Open edX with client-side face detection.',
    long_description=open('README.md').read() if open('README.md') else '', 
    long_description_content_type='text/markdown', 
    author='Ritu Raj Kumar', 
    author_email='riturajkumar8544@gmail.com', 
    url='https://github.com/Raj85446696/my_video_tracker_xblock', 
    packages=find_packages(), # Automatically finds all Python packages (like 'my_video_tracker_xblock' directory)
    install_requires=[
        'XBlock', # Core XBlock library
        'xblock-utils', # Common utilities for XBlocks
        'web-fragments', # Used for rendering web fragments in XBlocks
    ],
    entry_points={
        'xblock.v1': [
            # This is the crucial line that tells Open edX about your XBlock
            # Format: 'xblock_name = python_package_name:XBlockClassName'
            'my_video_tracker_xblock = my_video_tracker_xblock:VideoEngagementXBlock',
        ]
    },
    package_data={
        'my_video_tracker_xblock': [
            # Include all static assets required by your XBlock
            'static/*',
            'static/html/*',
            'static/js/*',
            'static/css/*',
            'public/*', # If you decide to self-host face-api.js weights here
        ]
    },
    classifiers=[
        'Programming Language :: Python :: 3',
        'License :: OSI Approved :: Apache Software License', # Or your preferred license
        'Operating System :: OS Independent',
        'Framework :: Open edX',
    ],
    zip_safe=False, # Important for XBlocks
)
