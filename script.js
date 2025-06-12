// Global variables
let messages = [];
let isLoading = false;
let apiKey = '';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Load API key from localStorage
    const storedApiKey = localStorage.getItem('gemini-api-key');
    if (storedApiKey) {
        apiKey = storedApiKey;
    } else {
        showApiKeyModal();
    }

    // Add welcome message
    addWelcomeMessage();

    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');

    // Enter key handling
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 128) + 'px';
    });

    // Input validation
    messageInput.addEventListener('input', function() {
        const hasText = this.value.trim().length > 0;
        sendButton.disabled = !hasText || isLoading || !apiKey;
        sendButton.classList.toggle('opacity-50', !hasText || isLoading || !apiKey);
        sendButton.classList.toggle('cursor-not-allowed', !hasText || isLoading || !apiKey);
    });
}

function addWelcomeMessage() {
    const welcomeMessage = {
        id: 'welcome',
        text: "Hello! I'm your AI assistant. I'm here to help you with any questions or tasks you might have. Feel free to ask me anything!",
        isUser: false,
        timestamp: getCurrentTime()
    };
    
    messages.push(welcomeMessage);
    renderMessages();
}

function getCurrentTime() {
    return new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value.trim();

    if (!messageText || isLoading || !apiKey) {
        if (!apiKey) {
            showApiKeyModal();
        }
        return;
    }

    // Add user message
    const userMessage = {
        id: Date.now().toString(),
        text: messageText,
        isUser: true,
        timestamp: getCurrentTime()
    };

    messages.push(userMessage);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Hide welcome screen if visible
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }

    renderMessages();
    setLoading(true);

    // Send to AI
    sendToGemini(messageText);
}

async function sendToGemini(message) {
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
    
    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are a helpful AI assistant. Please respond to this message in a natural, conversational way: ${message}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates.length > 0) {
            const aiResponse = data.candidates[0].content.parts[0].text;
            
            const aiMessage = {
                id: (Date.now() + 1).toString(),
                text: aiResponse,
                isUser: false,
                timestamp: getCurrentTime()
            };

            messages.push(aiMessage);
        } else {
            throw new Error('No response from AI');
        }
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        
        const errorMessage = {
            id: (Date.now() + 1).toString(),
            text: "I apologize, but I'm experiencing some technical difficulties. Please check your API key or try again later.",
            isUser: false,
            timestamp: getCurrentTime()
        };

        messages.push(errorMessage);
    } finally {
        setLoading(false);
        renderMessages();
    }
}

function setLoading(loading) {
    isLoading = loading;
    const sendButton = document.getElementById('sendButton');
    const messageInput = document.getElementById('messageInput');
    
    sendButton.disabled = loading || !apiKey;
    messageInput.disabled = loading;
    
    if (loading) {
        showLoadingMessage();
    } else {
        hideLoadingMessage();
    }
}

function showLoadingMessage() {
    const loadingHtml = `
        <div id="loadingMessage" class="flex items-start gap-4 mb-8 message-enter">
            <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg">
                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
            </div>
            
            <div class="max-w-xs sm:max-w-md lg:max-w-2xl">
                <div class="inline-block p-4 rounded-2xl bg-white text-gray-800 rounded-bl-md border border-gray-100 shadow-md">
                    <div class="flex items-center space-x-2">
                        <div class="flex space-x-1">
                            <div class="w-2 h-2 bg-purple-400 rounded-full loading-dot"></div>
                            <div class="w-2 h-2 bg-purple-400 rounded-full loading-dot"></div>
                            <div class="w-2 h-2 bg-purple-400 rounded-full loading-dot"></div>
                        </div>
                        <span class="text-sm text-gray-500 font-medium">AI is thinking...</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.insertAdjacentHTML('beforeend', loadingHtml);
    scrollToBottom();
}

function hideLoadingMessage() {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

function renderMessages() {
    const messagesArea = document.getElementById('messagesArea');
    const welcomeScreen = document.getElementById('welcomeScreen');
    
    // Clear existing messages (except welcome screen)
    const existingMessages = messagesArea.querySelectorAll('.message-item');
    existingMessages.forEach(msg => msg.remove());
    
    // Hide welcome screen if we have more than just the welcome message
    if (messages.length > 1 && welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }
    
    messages.forEach(message => {
        const messageHtml = createMessageHtml(message);
        messagesArea.insertAdjacentHTML('beforeend', messageHtml);
    });
    
    scrollToBottom();
}

function createMessageHtml(message) {
    const isUser = message.isUser;
    const alignmentClass = isUser ? 'flex-row-reverse' : '';
    const textAlignClass = isUser ? 'text-right' : 'text-left';
    const bubbleClass = isUser 
        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md' 
        : 'bg-white text-gray-800 rounded-bl-md border border-gray-100 shadow-md';
    const iconBgClass = isUser 
        ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
        : 'bg-gradient-to-r from-purple-500 to-indigo-600';
    
    const icon = isUser 
        ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>`
        : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>`;

    return `
        <div class="message-item flex items-start gap-4 mb-8 message-enter ${alignmentClass}">
            <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${iconBgClass} text-white">
                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    ${icon}
                </svg>
            </div>
            
            <div class="max-w-xs sm:max-w-md lg:max-w-2xl ${textAlignClass}">
                <div class="inline-block p-4 rounded-2xl shadow-sm ${bubbleClass}">
                    <p class="text-sm leading-relaxed whitespace-pre-wrap font-medium">${escapeHtml(message.text)}</p>
                </div>
                ${message.timestamp ? `<p class="text-xs text-gray-500 mt-2 px-1 ${textAlignClass}">${message.timestamp}</p>` : ''}
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('messagesContainer');
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
}

function clearChat() {
    messages = [];
    addWelcomeMessage();
    renderMessages();
    
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) {
        welcomeScreen.style.display = 'block';
    }
}

function showApiKeyModal() {
    const modal = document.getElementById('apiKeyModal');
    modal.classList.remove('hidden');
    modal.classList.add('modal-enter');
    
    // Focus on input
    setTimeout(() => {
        document.getElementById('apiKeyInput').focus();
    }, 100);
}

function hideApiKeyModal() {
    const modal = document.getElementById('apiKeyModal');
    modal.classList.add('hidden');
    modal.classList.remove('modal-enter');
}

function saveApiKey(event) {
    event.preventDefault();
    const apiKeyInput = document.getElementById('apiKeyInput');
    const newApiKey = apiKeyInput.value.trim();
    
    if (newApiKey) {
        apiKey = newApiKey;
        localStorage.setItem('gemini-api-key', newApiKey);
        hideApiKeyModal();
        
        // Enable send button if there's text
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const hasText = messageInput.value.trim().length > 0;
        sendButton.disabled = !hasText;
        sendButton.classList.toggle('opacity-50', !hasText);
        sendButton.classList.toggle('cursor-not-allowed', !hasText);
        
        // Clear the input
        apiKeyInput.value = '';
    }
}

// Close modal when clicking outside
document.getElementById('apiKeyModal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideApiKeyModal();
    }
});
