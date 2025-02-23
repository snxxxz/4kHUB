const resolveBtn = document.getElementById('resolveBtn');
const clearBtn = document.getElementById('clearBtn');
const cfxInput = document.getElementById('cfxInput');
const serverInfoDiv = document.getElementById('serverInfo');
const playerListDiv = document.getElementById('playerList');
const spinner = document.getElementById('loading');

// Helper function to fetch with timeout
async function fetchWithTimeout(url, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

resolveBtn.addEventListener('click', async () => {
    const cfxLink = cfxInput.value.trim();
    if (!cfxLink) {
        serverInfoDiv.innerHTML = "<p>Please enter a CFX.re link!</p>";
        serverInfoDiv.className = 'server-info animate__animated animate__shakeX';
        playerListDiv.innerHTML = '';
        return;
    }

    // Show spinner
    spinner.style.display = 'block';
    serverInfoDiv.innerHTML = '';
    playerListDiv.innerHTML = '';

    const serverId = cfxLink.split('/').pop();
    try {
        // Fetch server data from CFX.re API
        const serverResponse = await fetchWithTimeout(`https://servers-frontend.fivem.net/api/servers/single/${serverId}`);
        if (!serverResponse.ok) throw new Error('Server not found');
        const serverData = await serverResponse.json();
        const ip = serverData.Data.connectEndPoints[0];
        const hostname = serverData.Data.hostname;
        const playersOnline = serverData.Data.clients;
        const maxPlayers = serverData.Data.svMaxclients;

        // Attempt to fetch player list from multiple endpoints
        let players = [];
        const endpoints = [
            `http://${ip}/players.json`,
            `http://${ip}/dynamic.json`, // Some servers use this
            `http://${ip}/info.json`,    // Rare, but worth a shot
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetchWithTimeout(endpoint);
                if (response.ok) {
                    const data = await response.json();
                    // Handle different data structures
                    if (Array.isArray(data)) {
                        players = data; // Standard players.json format
                    } else if (data.players && Array.isArray(data.players)) {
                        players = data.players; // dynamic.json or similar
                    }
                    if (players.length > 0) break; // Exit if we got data
                }
            } catch (e) {
                console.warn(`Failed to fetch from ${endpoint}: ${e.message}`);
            }
        }

        // Fallback: Check CFX.re API response for player data
        if (players.length === 0 && serverData.Data.players && Array.isArray(serverData.Data.players)) {
            players = serverData.Data.players;
        }

        // Hide spinner
        spinner.style.display = 'none';

        // Display server info
        serverInfoDiv.innerHTML = `
            <p>Server IP: ${ip}</p>
            <p>Hostname: ${hostname}</p>
            <p>Players Online: ${playersOnline}/${maxPlayers}</p>
        `;
        serverInfoDiv.className = 'server-info animate__animated animate__bounceIn';

        // Display player list with more details
        if (players.length > 0) {
            let tableHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Ping</th>
                            <th>Identifier</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            players.forEach((player, index) => {
                const playerId = player.id || index + 1;
                const playerName = player.name || 'Unknown';
                const playerPing = player.ping !== undefined ? `${player.ping} ms` : 'N/A';
                const playerIdentifier = player.identifiers && player.identifiers.length > 0 
                    ? player.identifiers[0].substring(0, 20) + '...' 
                    : 'N/A';

                tableHTML += `
                    <tr style="animation-delay: ${index * 0.1}s" class="row-slide-in">
                        <td>${playerId}</td>
                        <td>${playerName}</td>
                        <td>${playerPing}</td>
                        <td>${playerIdentifier}</td>
                    </tr>
                `;
            });
            tableHTML += '</tbody></table>';
            playerListDiv.innerHTML = tableHTML;
            playerListDiv.className = 'player-list animate__animated animate__fadeIn';
        } else {
            playerListDiv.innerHTML = `
                <p>No player data available. This server might not expose it publicly.</p>
                <p>Players Online (from CFX): ${playersOnline}</p>
            `;
            playerListDiv.className = 'player-list animate__animated animate__fadeIn';
        }
    } catch (error) {
        spinner.style.display = 'none';
        serverInfoDiv.innerHTML = `<p>Error: ${error.message || 'Couldn’t resolve server. It might be offline or private.'}</p>`;
        serverInfoDiv.className = 'server-info animate__animated animate__shakeX';
        playerListDiv.innerHTML = '';
    }
});

clearBtn.addEventListener('click', () => {
    cfxInput.value = '';
    serverInfoDiv.innerHTML = '';
    playerListDiv.innerHTML = '';
    serverInfoDiv.className = 'server-info animate__animated';
    playerListDiv.className = 'player-list animate__animated';
    spinner.style.display = 'none';
});

// Custom row animation
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
    .row-slide-in {
        animation: slideInRow 0.5s ease-out forwards;
    }
`, styleSheet.cssRules.length);