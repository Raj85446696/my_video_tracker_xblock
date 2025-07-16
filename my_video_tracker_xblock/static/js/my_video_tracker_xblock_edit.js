function MyVideoTrackerXBlockEdit(runtime, element) {
  const saveButton = $(element).find('.save-button');

  saveButton.on('click', function () {
    const handlerUrl = runtime.handlerUrl(element, 'save_settings');

    const videoUrl = $(element).find('#video-url-input').val().trim();
    const displayName = $(element).find('#display-name-input').val().trim();

    if (!videoUrl) {
      alert("Please enter a video URL.");
      return;
    }

    const data = {
      display_name: displayName,
      video_url: videoUrl,
    };

    $.ajax({
      type: "POST",
      url: handlerUrl,
      data: JSON.stringify(data),
      contentType: "application/json; charset=utf-8",
      dataType: "json",
      success: function (response) {
        if (response.status === 'success') {
          $("#save-message", element).text("Settings saved successfully.");
        } else {
          alert("Error saving settings: " + response.message);
        }
      },
      error: function (xhr, status, error) {
        alert("Unexpected error: " + error);
      }
    });
  });
}
