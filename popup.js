document.addEventListener('DOMContentLoaded', function() {
  const streamerList = document.getElementById('streamerList');
  
  const CLIENT_ID = '3h7no33l6eucfag01vzv2dk2fni2y5';
  const CLIENT_SECRET = 'dvj9u7vc3y5odpt08unx97uajppzmp';

  let accessToken = '';

  const streamers = [
    { name: 'Plaqueboymax', image: 'images/plaqueboymax.png', image_offline: 'images/border/plaqueboymaxoffline232.png', image_online: 'images/border/plaqueboymaxonline232.png' },
    { name: 'Jasontheween', image: 'images/jasontheween.png', image_offline: 'images/border/jasontheweenoffline232.png', image_online: 'images/border/jasontheweenonline232.png' },
    { name: 'Stableronaldo', image: 'images/stableronaldo.png', image_offline: 'images/border/stableronaldooffline232.png', image_online: 'images/border/stableronaldoonline232.png' },
    { name: 'Lacy', image: 'images/lacy.png', image_offline: 'images/border/lacyoffline232.png', image_online: 'images/border/lacyonline232.png' },
    { name: 'Silky', image: 'images/silky.png', image_offline: 'images/border/silkyoffline232.png', image_online: 'images/border/silkyonline232.png' }
  ];

  async function handleCheckboxChange(streamerName) {
    const checkboxes = document.querySelectorAll('.streamer-checkbox');
    checkboxes.forEach(cb => {
      if (cb.dataset.streamerName !== streamerName) {
        cb.checked = false;
      }
    });

    const selectedStreamer = streamers.find(s => s.name === streamerName);
    if (selectedStreamer) {
      const currentCheckbox = Array.from(checkboxes).find(cb => cb.dataset.streamerName === streamerName);
      const isChecked = currentCheckbox.checked;

      await chrome.storage.sync.set({ 
        selectedStreamer: isChecked ? streamerName : null
      });
      
      if (isChecked) {
        // Always set to offline icon first
        const offlineIconPath = {
          "16": selectedStreamer.image_offline,
          "48": selectedStreamer.image_offline,
          "128": selectedStreamer.image_offline
        };

        try {
          await chrome.action.setIcon({ path: offlineIconPath });
          
          // Check current status and update if online
          const streamData = await getStreamerStatus(streamerName);
          if (streamData) {
            const onlineIconPath = {
              "16": selectedStreamer.image_online,
              "48": selectedStreamer.image_online,
              "128": selectedStreamer.image_online
            };
            await chrome.action.setIcon({ path: onlineIconPath });
          }
        } catch (error) {
          console.error('Error setting icon:', error);
          await chrome.action.setIcon({ 
            path: {
              "16": "icons/icon16.png",
              "48": "icons/icon48.png",
              "128": "icons/icon128.png"
            }
          });
        }
      } else {
        // Reset to default icon when unchecked
        await chrome.action.setIcon({ 
          path: {
            "16": "icons/icon16.png",
            "48": "icons/icon48.png",
            "128": "icons/icon128.png"
          }
        });
      }
    }
  }

  async function getAccessToken() {
    try {
      const response = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Store token and its expiration time
      await chrome.storage.local.set({
        accessToken: data.access_token,
        tokenExpiry: Date.now() + (data.expires_in * 1000)
      });
      return data.access_token;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  async function validateAndGetToken() {
    const { accessToken, tokenExpiry } = await chrome.storage.local.get(['accessToken', 'tokenExpiry']);
    
    if (!accessToken || !tokenExpiry || Date.now() >= tokenExpiry) {
      return await getAccessToken();
    }
    
    return accessToken;
  }

  async function getStreamerStatus(streamerName) {
    try {
      const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${streamerName.toLowerCase()}`, {
        headers: {
          'Client-ID': CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0];
    } catch (error) {
      console.error('Error getting streamer status:', error);
      return null;
    }
  }

  async function updateStreamerList() {
    if (!accessToken) {
      accessToken = await getAccessToken();
      if (!accessToken) return;
    }

    streamerList.innerHTML = '';
    
    const { selectedStreamer } = await chrome.storage.sync.get('selectedStreamer');

    // Fetch all streamer statuses in parallel
    const streamDataPromises = streamers.map(streamer => getStreamerStatus(streamer.name));
    const streamDataResults = await Promise.all(streamDataPromises);

    // Create and append all streamer elements
    streamers.forEach((streamer, index) => {
      const streamData = streamDataResults[index];
      const listItem = document.createElement('li');
      listItem.className = 'streamer-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'streamer-checkbox';
      checkbox.dataset.streamerName = streamer.name;
      checkbox.checked = selectedStreamer === streamer.name;
      checkbox.addEventListener('change', () => handleCheckboxChange(streamer.name));

      const avatarImg = document.createElement('img');
      avatarImg.className = 'streamer-avatar';
      avatarImg.src = streamer.image;
      avatarImg.onerror = () => { avatarImg.src = 'default-avatar.png'; };

      const infoDiv = document.createElement('div');
      infoDiv.className = 'streamer-info';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'streamer-name';
      nameSpan.textContent = streamer.name;

      const gameSpan = document.createElement('span');
      gameSpan.className = 'streamer-game';

      const statusLink = document.createElement('a');
      statusLink.className = 'status-indicator';
      statusLink.href = `https://twitch.tv/${streamer.name}`;
      statusLink.target = '_blank';

      if (streamData) {
        gameSpan.textContent = streamData.game_name;
        statusLink.classList.add('online');
        statusLink.textContent = 'ONLINE';
      } else {
        gameSpan.textContent = 'Offline';
        statusLink.classList.add('offline');
        statusLink.textContent = 'OFFLINE';
      }

      infoDiv.appendChild(nameSpan);
      infoDiv.appendChild(document.createElement('br'));
      infoDiv.appendChild(gameSpan);

      listItem.appendChild(checkbox);
      listItem.appendChild(avatarImg);
      listItem.appendChild(infoDiv);
      listItem.appendChild(statusLink);

      streamerList.appendChild(listItem);
    });
  }

  async function updateStreamerIcon() {
    const { selectedStreamer } = await chrome.storage.sync.get('selectedStreamer');
    if (!selectedStreamer) return;

    const streamer = streamers.find(s => s.name === selectedStreamer);
    if (!streamer) return;

    accessToken = await validateAndGetToken();
    if (!accessToken) return;

    try {
      const streamData = await getStreamerStatus(selectedStreamer);
      const iconPath = {
        "16": streamData ? streamer.image_online : streamer.image_offline,
        "48": streamData ? streamer.image_online : streamer.image_offline,
        "128": streamData ? streamer.image_online : streamer.image_offline
      };
      await chrome.action.setIcon({ path: iconPath });
    } catch (error) {
      console.error('Error updating streamer icon:', error);
    }
  }

  // Initialize extension icon based on stored preferences
  async function initializeExtensionIcon() {
    const { selectedStreamer } = await chrome.storage.sync.get('selectedStreamer');
    
    if (selectedStreamer) {
      const streamer = streamers.find(s => s.name === selectedStreamer);
      if (streamer) {
        // Set offline icon first
        const offlineIconPath = {
          "16": streamer.image_offline,
          "48": streamer.image_offline,
          "128": streamer.image_offline
        };
        
        try {
          await chrome.action.setIcon({ path: offlineIconPath });
          
          // Check if streamer is online and update accordingly
          const streamData = await getStreamerStatus(streamer.name);
          if (streamData) {
            const onlineIconPath = {
              "16": streamer.image_online,
              "48": streamer.image_online,
              "128": streamer.image_online
            };
            await chrome.action.setIcon({ path: onlineIconPath });
          }
        } catch (error) {
          console.error('Error setting initial icon:', error);
        }
      }
    }
  }

  // Start the extension
  initializeExtensionIcon();
  updateStreamerList();

  // Update streamer status and icon every minute
  setInterval(async () => {
    accessToken = await validateAndGetToken();
    if (accessToken) {
      await updateStreamerList();
      await updateStreamerIcon();
    }
  }, 60000);

  // Initial token setup
  validateAndGetToken().then(token => {
    accessToken = token;
  });
});
