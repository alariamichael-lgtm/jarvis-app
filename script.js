const statusValue = document.getElementById('statusValue');
const timeValue = document.getElementById('timeValue');
const voiceInput = document.getElementById('voiceInput');
const responseDisplay = document.getElementById('responseDisplay');
const voiceBtn = document.getElementById('voiceBtn');
const listeningIndicator = document.getElementById('listeningIndicator');

const searchModal = document.getElementById('searchModal');
const mapModal = document.getElementById('mapModal');
const appModal = document.getElementById('appModal');
const chatModal = document.getElementById('chatModal');

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');

const chatBox = document.getElementById('chatBox');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

const mockSearchResults = {
    default: [
        {
            title: 'Global Network Status',
            text: 'All core systems are stable and connected to the primary intelligence network.'
        },
        {
            title: 'Current Research Focus',
            text: 'The interface is operating in a passive monitoring mode with secure search access enabled.'
        },
        {
            title: 'Operational Notes',
            text: 'This dashboard is designed as a front-end simulation without external AI model or voice backend.'
        }
    ],
    'world map': [
        {
            title: 'World Map View',
            text: 'The system includes a geospatial map for city and global monitoring overlays.'
        },
        {
            title: 'Map Tools',
            text: 'The interface supports world view, zoom, and location monitoring with a clean command-center aesthetic.'
        }
    ],
    'jarvis': [
        {
            title: 'JARVIS Interface',
            text: 'A futuristic command interface built for monitoring, search, and assistant-like interaction.'
        },
        {
            title: 'Design Concept',
            text: 'This version focuses on the visual control-center appearance without voice or AI model integration.'
        }
    ]
};

function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    timeValue.textContent = time;
}

function setSystemStatus(text) {
    statusValue.textContent = text;
}

function openModal(modal) {
    modal.classList.add('active');
}

function closeModal(modal) {
    modal.classList.remove('active');
}

function handleAction(action) {
    switch (action) {
        case 'open-app':
            openModal(appModal);
            responseDisplay.textContent = 'App launcher online. Select a target system.';
            break;
        case 'web-search':
            openModal(searchModal);
            responseDisplay.textContent = 'Search module engaged. Enter a query.';
            break;
        case 'map-view':
            openModal(mapModal);
            responseDisplay.textContent = 'World map connected. Monitoring global activity.';
            break;
        case 'ai-chat':
            openModal(chatModal);
            responseDisplay.textContent = 'Assistant interface available. Awaiting input.';
            break;
        default:
            break;
    }
}

function renderSearchResults(query) {
    const lowerQuery = (query || '').trim().toLowerCase();
    let entries = mockSearchResults.default;

    Object.keys(mockSearchResults).forEach((key) => {
        if (key !== 'default' && lowerQuery.includes(key)) {
            entries = mockSearchResults[key];
        }
    });

    searchResults.innerHTML = '';
    entries.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.innerHTML = `
            <h3>${item.title}</h3>
            <p>${item.text}</p>
        `;
        searchResults.appendChild(card);
    });
}

function addChatMessage(sender, text) {
    const message = document.createElement('div');
    message.className = `chat-message ${sender}`;
    message.textContent = text;
    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function botReply(message) {
    const lower = message.toLowerCase();

    if (lower.includes('hello') || lower.includes('hi')) {
        return 'Hello, sir. All systems are online and ready for operation.';
    }
    if (lower.includes('search')) {
        return 'Search functions are active. Use the web research panel to browse the current system data.';
    }
    if (lower.includes('map')) {
        return 'The world map module is connected and ready for global monitoring.';
    }
    if (lower.includes('status') || lower.includes('health')) {
        return 'System health is optimal. Network, power, and core intelligence modules are stable.';
    }
    if (lower.includes('jarvis')) {
        return 'JARVIS is online in a front-end control room mode with no model backend connected.';
    }
    return 'Command registered. This interface is running in local simulation mode without an external AI or voice model.';
}

function initializeMap() {
    if (window.mapInstance) return;

    window.mapInstance = L.map('map', {
        zoomControl: true,
        worldCopyJump: true
    }).setView([20, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(window.mapInstance);

    const markers = [
        [40.7128, -74.0060],
        [51.5074, -0.1278],
        [35.6762, 139.6503],
        [-33.8688, 151.2093],
        [28.6139, 77.2090]
    ];

    markers.forEach(([lat, lng]) => {
        L.marker([lat, lng]).addTo(window.mapInstance);
    });
}

const actionButtons = document.querySelectorAll('.action-btn');
actionButtons.forEach((button) => {
    button.addEventListener('click', () => handleAction(button.dataset.action));
});

document.querySelectorAll('.close-btn').forEach((closeBtn) => {
    closeBtn.addEventListener('click', () => {
        closeModal(searchModal);
        closeModal(mapModal);
        closeModal(appModal);
        closeModal(chatModal);
    });
});

searchBtn.addEventListener('click', () => {
    const query = searchInput.value || 'jarvis';
    renderSearchResults(query);
    responseDisplay.textContent = `Research query engaged: ${query}`;
});

voiceBtn.addEventListener('click', () => {
    const value = voiceInput.value.trim();
    if (!value) {
        setSystemStatus('LISTENING');
        responseDisplay.textContent = 'Listening for a command...';
        listeningIndicator.style.opacity = '1';
        return;
    }

    responseDisplay.textContent = `Command received: ${value}`;
    setSystemStatus('ACTIVE');
    const action = value.toLowerCase();

    if (action.includes('search')) handleAction('web-search');
    if (action.includes('map')) handleAction('map-view');
    if (action.includes('open')) handleAction('open-app');
    if (action.includes('chat') || action.includes('assistant')) handleAction('ai-chat');
});

voiceInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        const value = voiceInput.value.trim();
        if (!value) return;
        responseDisplay.textContent = `Command received: ${value}`;
        const lower = value.toLowerCase();
        if (lower.includes('search')) handleAction('web-search');
        if (lower.includes('map')) handleAction('map-view');
        if (lower.includes('open')) handleAction('open-app');
        if (lower.includes('chat') || lower.includes('assistant')) handleAction('ai-chat');
    }
});

sendBtn.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (!message) return;
    addChatMessage('user', message);
    chatInput.value = '';
    const response = botReply(message);
    setTimeout(() => addChatMessage('bot', response), 300);
});

chatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        sendBtn.click();
    }
});

const initialMessages = [
    'System online. Primary modules are stable.',
    'No external AI or voice model is connected in this version.',
    'Command center ready for user interaction.'
];

initialMessages.forEach((msg, index) => {
    setTimeout(() => addChatMessage('bot', msg), index * 200);
});

initializeMap();
updateClock();
setInterval(updateClock, 1000);
renderSearchResults('jarvis');
setSystemStatus('ONLINE');

window.addEventListener('load', () => {
    setTimeout(() => {
        responseDisplay.textContent = 'Welcome, sir. Systems online and ready to assist.';
    }, 600);
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeModal(searchModal);
        closeModal(mapModal);
        closeModal(appModal);
        closeModal(chatModal);
    }
});

const appItems = document.querySelectorAll('.app-item');
appItems.forEach((item) => {
    item.addEventListener('click', () => {
        const url = item.dataset.url;
        if (url) {
            window.open(url, '_blank', 'noopener');
            responseDisplay.textContent = `Launching ${item.textContent.trim()}...`;
        }
    });
});
