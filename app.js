import { CreateMLCEngine } from
    "https://esm.run/@mlc-ai/web-llm";

const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const chatMessages = document.getElementById("chatMessages");
const newChatBtn = document.getElementById("newChatBtn");

let engine = null;
let messages = [];

const MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";


// -----------------------------
// Add message to chat
// -----------------------------

function appendMessage(sender, text, className) {

    const messageDiv = document.createElement("div");

    messageDiv.className = `message ${className}`;

    const avatar = document.createElement("div");

    avatar.className = "avatar";

    avatar.textContent =
        sender === "AI" ? "AI" : "You";

    const bubble = document.createElement("div");

    bubble.className = "message-bubble";

    bubble.textContent = text;

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);

    chatMessages.appendChild(messageDiv);

    chatMessages.scrollTop =
        chatMessages.scrollHeight;
}


// -----------------------------
// Load AI
// -----------------------------

async function loadAI() {

    sendBtn.disabled = true;

    appendMessage(
        "AI",
        "Loading the AI into your browser. This may take a few minutes the first time...",
        "ai-message"
    );

    try {

        engine = await CreateMLCEngine(
            MODEL,
            {
                initProgressCallback: (progress) => {

                    console.log(
                        progress.text || progress
                    );

                }
            }
        );

        chatMessages.lastElementChild?.remove();

        appendMessage(
            "AI",
            "I'm ready! Ask me anything.",
            "ai-message"
        );

        sendBtn.disabled = false;

    } catch (error) {

        console.error(error);

        chatMessages.lastElementChild?.remove();

        appendMessage(
            "AI",
            "I couldn't load the AI. Your browser may not support WebGPU, or your device may not have enough memory.",
            "ai-message"
        );
    }
}


// -----------------------------
// Send message
// -----------------------------

async function handleSend() {

    const text =
        userInput.value.trim();

    if (!text || !engine) return;

    appendMessage(
        "You",
        text,
        "user-message"
    );

    userInput.value = "";

    userInput.style.height = "auto";

    messages.push({
        role: "user",
        content: text
    });

    sendBtn.disabled = true;

    appendMessage(
        "AI",
        "Thinking...",
        "ai-message"
    );

    const thinkingMessage =
        chatMessages.lastElementChild;

    try {

        const response =
            await engine.chat.completions.create({

                messages: [
                    {
                        role: "system",
                        content:
                            "You are a helpful AI assistant. Give clear and friendly answers."
                    },

                    ...messages
                ],

                temperature: 0.7,

                max_tokens: 512

            });

        const answer =
            response.choices?.[0]?.message?.content ||
            "I couldn't generate a response.";

        thinkingMessage?.remove();

        appendMessage(
            "AI",
            answer,
            "ai-message"
        );

        messages.push({
            role: "assistant",
            content: answer
        });

    } catch (error) {

        console.error(error);

        thinkingMessage?.remove();

        appendMessage(
            "AI",
            "Something went wrong while generating the response.",
            "ai-message"
        );

    } finally {

        sendBtn.disabled = false;

        userInput.focus();
    }
}


// -----------------------------
// Enter to send
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
// Resize textarea
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

if (newChatBtn) {

    newChatBtn.addEventListener(
        "click",
        () => {

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
        }
    );
}


// -----------------------------
// Start AI
// -----------------------------

loadAI();
