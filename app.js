import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm";

const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const chatMessages = document.getElementById("chatMessages");
const newChatBtn = document.getElementById("newChatBtn");

let aiModel = null;
let isLoading = false;


// -----------------------------
// Display messages
// -----------------------------

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


// -----------------------------
// Loading message
// -----------------------------

function setLoadingMessage(text) {

    const existing = document.getElementById("loading-message");

    if (existing) {
        existing.querySelector(".message-bubble").textContent = text;
        return;
    }

    const div = document.createElement("div");

    div.className = "message ai-message";
    div.id = "loading-message";

    div.innerHTML = `
        <div class="avatar">AI</div>
        <div class="message-bubble">${text}</div>
    `;

    chatMessages.appendChild(div);

    chatMessages.scrollTop = chatMessages.scrollHeight;
}


function removeLoadingMessage() {

    document.getElementById("loading-message")?.remove();
}


// -----------------------------
// Load AI
// -----------------------------

async function loadAI() {

    try {

        setLoadingMessage(
            "Loading AI model... The first load can take a little while."
        );

        aiModel = await pipeline(
            "text-generation",
            "Xenova/distilgpt2"
        );

        removeLoadingMessage();

        appendMessage(
            "AI",
            "I'm ready! Type a message below.",
            "ai-message"
        );

        sendBtn.disabled = false;

    } catch (error) {

        console.error("AI loading error:", error);

        removeLoadingMessage();

        appendMessage(
            "AI",
            "I couldn't load the AI model. Please refresh the page and try again.",
            "ai-message"
        );

        sendBtn.disabled = true;
    }
}


// -----------------------------
// Send message
// -----------------------------

async function handleSend() {

    const text = userInput.value.trim();

    if (!text) {
        return;
    }

    if (!aiModel) {

        appendMessage(
            "AI",
            "The AI is still loading. Please wait a moment.",
            "ai-message"
        );

        return;
    }

    if (isLoading) {
        return;
    }

    isLoading = true;
    sendBtn.disabled = true;


    // Show user's message

    appendMessage(
        "You",
        text,
        "user-message"
    );

    userInput.value = "";
    userInput.style.height = "auto";


    // Show thinking

    setLoadingMessage("Thinking...");


    try {

        const output = await aiModel(text, {

            max_new_tokens: 60,

            temperature: 0.8,

            do_sample: true,

            repetition_penalty: 1.1

        });


        removeLoadingMessage();


        let response = output?.[0]?.generated_text;


        if (!response) {

            response = "I couldn't generate a response.";

        } else {

            // DistilGPT2 often returns the original prompt
            // together with the generated text.

            if (response.startsWith(text)) {
                response = response.slice(text.length).trim();
            }

        }


        if (!response) {
            response = "I couldn't generate a response.";
        }


        appendMessage(
            "AI",
            response,
            "ai-message"
        );


    } catch (error) {

        console.error("Generation error:", error);

        removeLoadingMessage();

        appendMessage(
            "AI",
            "Sorry, something went wrong while generating the response.",
            "ai-message"
        );

    } finally {

        isLoading = false;
        sendBtn.disabled = false;

        userInput.focus();
    }
}


// -----------------------------
// Send button
// -----------------------------

sendBtn.addEventListener(
    "click",
    handleSend
);


// -----------------------------
// Enter key
// -----------------------------

userInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            handleSend();
        }

    }
);


// -----------------------------
// Auto resize textarea
// -----------------------------

userInput.addEventListener(
    "input",
    () => {

        userInput.style.height = "auto";

        userInput.style.height =
            `${userInput.scrollHeight}px`;

    }
);


// -----------------------------
// New chat
// -----------------------------

newChatBtn.addEventListener(
    "click",
    () => {

        chatMessages.innerHTML = "";

        appendMessage(
            "AI",
            "New chat started. What would you like to talk about?",
            "ai-message"
        );

        userInput.value = "";
        userInput.style.height = "auto";
        userInput.focus();

    }
);


// -----------------------------
// Start AI
// -----------------------------

sendBtn.disabled = true;

loadAI();
