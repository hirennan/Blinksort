import { pipeline } from '@huggingface/transformers'
let pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

const folders = {};
const folders_vdb = {}

chrome.runtime.onInstalled.addListener(
  ((details) => {
    chrome.bookmarks.getTree().then(
      async (tree) => {
        await printTree(tree[0].children, folders, folders_vdb);
        await chrome.storage.local.set({ folders }).then(() => {
          console.log("Folders and vectors saved!");
        });
        await avgVectors(folders_vdb)
        chrome.storage.local.set({ folders_vdb }).then(() => {
          console.log("Folders and vectors saved!");
        });
      });
  })())




// let entireTree = chrome.bookmarks.getTree();
// let vectorDB = {}

// let folders = {};
// let folders_vdb = {}


function preprocessURL(url) {
  try {
    const clean = decodeURIComponent(url)
      .replace(/^https?:\/\//, '')         // remove protocol
      .replace(/www\./, '')                // remove www
      .replace(/[?#].*$/, '')              // remove query/hash
      .replace(/\.[a-z]{2,4}(\/|$)/, ' ')   // remove .com, .org etc.
      .replace(/[-_/\.:]/g, ' ')            // replace separators with space
      .replace(/\s+/g, ' ')                 // replace multiple white spaces
      .toLowerCase();
    return clean;
  } catch (e) {
    return url;
  }
}


// entireTree.then(
//   async (tree) => {
//     await printTree(tree[0].children);

//     console.log("Final folders:", folders);
//     console.log("Final folders vdb:", folders_vdb);

//     await chrome.storage.local.set({ folders }).then(() => {
//       console.log("Folders and vectors saved!");
//     });
//     await avgVectors(folders_vdb)
//     chrome.storage.local.set({ folders_vdb }).then(() => {
//       console.log("Folders and vectors saved!");
//     });
//     chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
//     const url = tabs[0].url;
//     const processed = preprocessURL(url);
//     const vector = await pipe(processed, { pooling: 'mean', normalize: true });

//     const query = Array.from(vector.data);
//     console.log("Query vector:", query);

//     console.log(CosineSim(folders_vdb, query));
//   });
// }
// );


async function printTree(treeRoot, folders, folders_vdb, parentNode) {
  for (const node of treeRoot) {
    if (node.url) {
      folders[parentNode]['urls'].push(preprocessURL(node.title))
      const out = await pipe(preprocessURL(node.title) + parentNode, { pooling: 'mean', normalize: true });
      folders_vdb[parentNode].push(Array.from(out.data))
    } else {
      if (node.children) {
        folders[node.title] = { urls: [] }
        folders_vdb[node.title] = []
        folders[node.title]['id'] = node.id;
        await printTree(node.children, folders, folders_vdb, node.title)
      }
    }
  }
  console.log("Tree Done")
  return folders;
}

async function avgVectors(folders_vdb) {
  for (const [k, v] of Object.entries(folders_vdb)) {
    if (v.length != 0) {
      var length = Math.min(v.length, 3);
    } else {
      var length = v.length;
    }
    const sum = new Array(384).fill(0);
    if (length != 0) {
      for (let i = 0; i < length; i++) {
        for (let j = 0; j < 384; j++) {
          sum[j] += v[i][j];
        }
      }
      let avg = sum.map(val => val / length);
      folders_vdb[k] = avg;
    } else {
      folders_vdb[k] = sum;
    }
  }
}

function CosineSim(folders_vdb, query) {
  let compare = {}
  for (const [k, v] of Object.entries(folders_vdb)) {
    let dot = 0;
    for (let i = 0; i < 384; i++) {
      dot += v[i] * query[i];
    }
    compare[k] = dot;
  }
  return compare;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "predictFolder") {
    (async () => {
      const url = message.data;
      console.log("Received from popup:", message.data);

      const processed = preprocessURL(url);
      const vector = await pipe(processed, { pooling: 'mean', normalize: true });

      const query = Array.from(vector.data);
      let compareFold = CosineSim(folders_vdb, query)
      // const suggestedFold = Object.keys(compareFold).reduce((a, b) => compareFold[a] > compareFold[b] ? a : b);
      const topThree = Object.entries(compareFold)
        .sort((a, b) => b[1] - a[1]) // Sort by similarity score descending
        .slice(0, 3)                 // Take top 3
        .map(([key]) => key)
      const topThreeIds = []
      for (let i = 0; i < 3; i++) {
        topThreeIds[i] = folders[topThree[i]]['id']
      }
      const folderID = {
        name: topThree,
        id: topThreeIds
      }
      sendResponse(folderID); // respond back
    })();

    // return true to keep the sendResponse alive for async
    return true;
  }
});


// const query = []
// chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
//   const url = tabs[0].url;
//   console.log("Current URL is:", url)
//   const processed = preprocessURL(url);
//   const vector = await pipe(processed, { pooling: 'mean', normalize: true });

//   const query = Array.from(vector.data);
//   console.log("Query vector:", query);

//   // console.log(CosineSim(folders_vdb, query));
// });



// chrome.runtime.sendMessage({ action: 'getData' }, (response) => {
//   console.log('Received from background:', response.data);
// });

// document.getElementById("add-bookmark").addEventListener("click", async (tab) => {
//   console.log(tab.url)
// })

// const query = []

