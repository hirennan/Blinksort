document.addEventListener("DOMContentLoaded", async () => {
  const query = []
  var parentId = null;
  var url = null;
  var title = null;
  var urlCheck = false;
  await chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
    url = tabs[0].url;
    title = tabs[0].title;
    console.log("Current URL is:", url)
    await chrome.runtime.sendMessage({ action: "predictFolder", data: title }, (response) => {
      console.log("Response from background:", response);
      // const suggestedFold = Object.keys(response).reduce((a, b) => response[a] > response[b] ? a : b);
      document.getElementById("add-button-1").innerHTML = `➕ ${response['name'][0]}`
      document.getElementById("add-button-1").dataset.parentId = response['id'][0];
      document.getElementById("add-button-2").innerHTML = `➕ ${response['name'][1]}`
      document.getElementById("add-button-2").dataset.parentId = response['id'][1];
      document.getElementById("add-button-3").innerHTML = `➕ ${response['name'][2]}`
      document.getElementById("add-button-3").dataset.parentId = response['id'][2];

      chrome.bookmarks.search({ url: url }, function (results) {
        if (results.length > 0) {
          document.getElementById('info').innerHTML = '✅ Already bookmarked'
          urlCheck = true;
        }
        document.querySelectorAll(".add-button").forEach((element, index) => {
          element.classList.toggle("disabled", urlCheck === true);

          element.addEventListener('click', () => {
            if (urlCheck === false) {
              chrome.bookmarks.create({
                parentId: element.dataset.parentId,
                url: url,
                title: title
              })
            }
          })
        })
      })


    });
  });

  // document.getElementsByClassName('add-button').addEventListener('click', () => {
  //   chrome.bookmarks.create({
  //     parentId: parentId,
  //     url: url,
  //     title: title
  //   })
  // })
});