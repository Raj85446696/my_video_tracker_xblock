function VideoEngagementXBlockEditInit(runtime, element, data) {
    const saveButton = element.querySelector('.save-button');
    const videoUrlInput = element.querySelector('#video_url_input');
    const displayNameInput = element.querySelector('#display_name_input');

    saveButton.onclick = function() {
        runtime.post(data.saveHandlerUrl, {
            video_url: videoUrlInput.value,
            display_name: displayNameInput.value
        }).done(function(response) {
            console.log("Settings saved:", response);
            // Optionally, provide user feedback
        });
    };
}