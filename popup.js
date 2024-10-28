document.addEventListener('DOMContentLoaded', function() {
  const streamerList = document.getElementById('streamerList');
  
  const CLIENT_ID = '3h7no33l6eucfag01vzv2dk2fni2y5';
  const CLIENT_SECRET = 'dvj9u7vc3y5odpt08unx97uajppzmp';

  let accessToken = '';

  const streamers = [
    { name: 'Plaqueboymax', image: 'images/plaqueboymax.png' },
    { name: 'Jasontheween', image: 'images/jasontheween.png' },
    { name: 'Stableronaldo', image: 'images/stableronaldo.png' },
    { name: 'Lacy', image: 'images/lacy.png' },
    { name: 'Silky', image: 'images/silky.png' }
  ];

  async function getAccessToken() {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`
    });

    const data = await response.json();
    return data.access_token;
  }

  async function getStreamerStatus(streamerName) {
    const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${streamerName}`, {
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();
    return data.data[0];
  }

  async function updateStreamerList() {
    if (!accessToken) {
      accessToken = await getAccessToken();
    }

    for (const streamer of streamers) {
      const streamData = await getStreamerStatus(streamer.name);
      const listItem = document.createElement('li');
      listItem.className = 'streamer-item';

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

      const statusIndicator = document.createElement('div');
      statusIndicator.className = 'status-indicator';

      if (streamData) {
        gameSpan.textContent = streamData.game_name;
        statusIndicator.classList.add('online');
        statusIndicator.textContent = 'ONLINE';
      } else {
        gameSpan.textContent = 'Offline';
        statusIndicator.classList.add('offline');
        statusIndicator.textContent = 'OFFLINE';
      }

      infoDiv.appendChild(nameSpan);
      infoDiv.appendChild(document.createElement('br'));
      infoDiv.appendChild(gameSpan);

      listItem.appendChild(avatarImg);
      listItem.appendChild(infoDiv);
      listItem.appendChild(statusIndicator);

      streamerList.appendChild(listItem);
    }
  }

  updateStreamerList();
});