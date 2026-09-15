import { pipeline } from '@huggingface/transformers';

// Elements from your HTML
const userInput = document.getElementById('userInput') as HTMLTextAreaElement;
const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;
const chatMessages = document.getElementById('chatMessages') as HTMLDivElement;

let aiModel: any = null;

// 1. Load an existing lightweight AI model right when the page opens
async function loadAI() {
    appendMessage("System", "Loading existing AI model into your browser... (Please wait a moment)", "ai-message");
    
    try {
        // We use a small, efficient pre-built model ideal for web browsers
        aiModel = await pipeline('text-generation', 'Xenova/distilgpt2');
        
        // Remove loading message and show ready state
        chatMessages.lastElementChild?.remove();
        appendMessage("AI", "AI is ready! Type a message below.", "ai-message");
    } catch (error) {
        console.error(error);
        chatMessages.lastElementChild?.remove();
        appendMessage("AI", "Failed to load the AI model. Check your internet connection.", "ai-message");
    }
}

// 2. Helper function to display messages on screen like ChatGPT
function appendMessage(sender: string, text: string, className: string) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${className}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = sender === 'AI' ? 'AI' : 'You';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);
    chatMessages.appendChild(messageDiv);

    // Auto-scroll to the bottom of the chat
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 3. Handle sending messages when user clicks the button
async function handleSend() {
    const text = userInput.value.trim();
    if (!text || !aiModel) return;

    // Display user's message
    appendMessage('You', text, 'user-message');
    userInput.value = '';
    userInput.style.height = 'auto'; // Reset textarea size

    // Show temporary thinking state
    const loadingId = 'temp-loading';
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message ai-message';
    loadingDiv.id = loadingId;
    loadingDiv.innerHTML = `<div class="avatar">AI</div><div class="message-bubble">Thinking...</div>`;
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        // Generate a response using the pre-existing browser model
        const output = await aiModel(text, { 
            max_new_tokens: 60,
            temperature: 0.7,
            do_sample: true
        });

        // Remove thinking indicator
        document.getElementById(loadingId)?.remove();

        // Extract the generated text (fallback to raw output if needed)
        const generatedText = output[0]?.generated_text || "I couldn't generate a response.";
        
        // Display AI response
        appendMessage('AI', generatedText, 'ai-message');
    } catch (err) {
        console.error(err);
        document.getElementById(loadingId)?.remove();
        appendMessage('AI', 'Oops! Something went wrong during generation.', 'ai-message');
    }
}

// Event Listeners
sendBtn.addEventListener('click', handleSend);

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

// Auto-resize the input text box as you type
userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = `${userInput.scrollHeight}px`;
});

// Initialize on load
loadAI();
