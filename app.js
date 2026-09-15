const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const chatMessages = document.getElementById("chatMessages");
const newChatBtn = document.getElementById("newChatBtn");

// CHANGE THIS to your Cloudflare Worker URL later.
const API_URL = "YOUR_CLOUDFLARE_WORKER_URL";

let messages = [];

function appendMessage(sender, text, className) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${className}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = sender === "AI" ? "AI" : "You";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text;

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showThinking() {
    const div = document.createElement("div");

    div.className = "message ai-message";
    div.id = "thinking";

    div.innerHTML = `
        <div class="avatar">AI</div>
        <div class="message-bubble">Thinking...</div>
    `;

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeThinking() {
    document.getElementById("thinking")?.remove();
}

async function handleSend() {
    const text = userInput.value.trim();

    if (!text) return;

    if (API_URL === "YOUR_CLOUDFLARE_WORKER_URL") {
        appendMessage(
            "AI",
            "The AI connection has not been configured yet. Add your Cloudflare Worker URL to app.js.",
            "ai-message"
        );
        return;
    }

    sendBtn.disabled = true;

    appendMessage("You", text, "user-message");

    userInput.value = "";
    userInput.style.height = "auto";

    messages.push({
        role: "user",
        content: text
    });

    showThinking();

    try {
        const response = await fetch(API_URL, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                messages: messages
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        removeThinking();

        const answer =
            data.reply ||
            data.text ||
            data.response;

        if (!answer) {
            throw new Error("No AI response received.");
        }

        messages.push({
            role: "assistant",
            content: answer
        });

        appendMessage(
            "AI",
            answer,
            "ai-message"
        );

    } catch (error) {

        console.error(error);

        removeThinking();

        appendMessage(
            "AI",
            "Sorry, I couldn't connect to the AI right now. Please try again.",
            "ai-message"
        );

        // Remove failed user message from conversation history
        messages.pop();

    } finally {
        sendBtn.disabled = false;
        userInput.focus();
    }
}


// Send button
sendBtn.addEventListener("click", handleSend);


// Enter = send
userInput.addEventListener("keydown", (event) => {

    if (event.key === "Enter" && !event.shiftKey) {

        event.preventDefault();

        handleSend();
    }

});


// Auto resize
userInput.addEventListener("input", () => {

    userInput.style.height = "auto";

    userInput.style.height =
        `${userInput.scrollHeight}px`;

});


// New chat
newChatBtn.addEventListener("click", () => {

    messages = [];

    chatMessages.innerHTML = "";

    appendMessage(
        "AI",
        "New chat started. What would you like to talk about?",
        "ai-message"
    );

    userInput.value = "";
    userInput.style.height = "auto";
    userInput.focus();

});


// Startup message
sendBtn.disabled = false;

console.log("AI Assistant loaded.");
