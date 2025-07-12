function StudioXBlockInit(runtime, element, data) {
    const saveBtn = element.querySelector("#save_settings_btn");

    saveBtn.addEventListener("click", function () {
        const displayName = element.querySelector("#display_name_input").value;
        const videoUrl = element.querySelector("#video_url_input").value;

        runtime.notify('save', {state: 'start'});
        runtime.ajax('save_settings', {
            method: 'POST',
            data: JSON.stringify({
                display_name: displayName,
                video_url: videoUrl
            }),
            success: function () {
                runtime.notify('save', {state: 'end'});
            }
        });
    });
}
