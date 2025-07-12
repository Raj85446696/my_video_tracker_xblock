function MyVideoTrackerXBlockEdit(runtime, element) {
  $(element).find('.save-button').bind('click', function() {
    var handlerUrl = runtime.handlerUrl(element, 'save_settings');
    var data = {
      display_name: $(element).find('#display_name_input').val(),
      video_url: $(element).find('#video_url_input').val()
    };

    $.post(handlerUrl, JSON.stringify(data)).done(function(response) {
      if (response.status === 'success') {
        window.location.reload(false);
      } else {
        alert("Error saving settings: " + response.message);
      }
    });
  });
}