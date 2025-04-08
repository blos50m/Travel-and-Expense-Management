// chatbot.js

// Global variables for chatbot
const GROQ_API_KEY = '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'; 
const chatHistory = [];

// Initialize chatbot
function initChatbot() {
    // Chatbot toggle
    document.getElementById('chatbotBtn')?.addEventListener('click', toggleChatbot);
    document.getElementById('closeChatbot')?.addEventListener('click', toggleChatbot);
    
    // Send chatbot message
    document.getElementById('sendChatbotMessage')?.addEventListener('click', sendChatbotMessage);
    document.getElementById('chatbotInput')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatbotMessage();
        }
    });
}

// Toggle chatbot window
function toggleChatbot() {
    const chatbotWindow = document.getElementById('chatbotWindow');
    if (chatbotWindow.style.display === 'flex') {
        chatbotWindow.style.display = 'none';
    } else {
        chatbotWindow.style.display = 'flex';
        document.getElementById('chatbotInput').focus();
    }
}

// Add message to chat
function addChatMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = text;
    document.getElementById('chatbotMessages').appendChild(messageDiv);
    document.getElementById('chatbotMessages').scrollTop = document.getElementById('chatbotMessages').scrollHeight;
    
    chatHistory.push({ sender, text });
}

// Send message to Groq API
async function sendChatbotMessage() {
    const input = document.getElementById('chatbotInput');
    const message = input.value.trim();
    if (!message) return;
    
    input.disabled = true;
    const sendButton = document.querySelector('#chatbotSendButton');
    if (sendButton) sendButton.disabled = true;
    
    addChatMessage(message, 'user');
    input.value = '';
    
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'message bot-message';
    loadingMsg.innerHTML = '<div class="loading" style="display: inline-block; margin-right: 8px;"></div> Thinking...';
    document.getElementById('chatbotMessages').appendChild(loadingMsg);
    document.getElementById('chatbotMessages').scrollTop = document.getElementById('chatbotMessages').scrollHeight;

    try {
        const messages = chatHistory.map(chat => ({
            role: chat.sender === 'user' ? 'user' : 'assistant',
            content: chat.text
        }));
        messages.push({ role: 'user', content: message });

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}` 
            },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: messages,
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        if (response.status === 429) {
            throw new Error("Groq: Too many requests. Try again shortly.");
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Groq API error');
        }

        const data = await response.json();

        if (data.choices?.[0]?.message?.content) {
            const aiMessage = data.choices[0].message.content.trim();
            document.getElementById('chatbotMessages').removeChild(loadingMsg);
            addChatMessage(aiMessage, 'bot');
        } else {
            throw new Error("Groq returned no valid response.");
        }
    } catch (error) {
        document.getElementById('chatbotMessages').removeChild(loadingMsg);
        addChatMessage(`Error: ${error.message}`, 'bot');
        console.error("Groq error:", error);
    } finally {
        input.disabled = false;
        if (sendButton) sendButton.disabled = false;
        input.focus();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initChatbot);