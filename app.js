import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const chatMessages = document.getElementById("chatMessages");

let engine = null;
let chatHistory = [];

const MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

function addMessage(sender, text, type) {
    const message = document.createElement("div");
    message.className = `message ${type}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = sender === "AI" ? "AI" : "You";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text;

    message.appendChild(avatar);
    message.appendChild(bubble);

    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return message;
}

async function startAI() {
    sendBtn.disabled = true;

    const loading = addMessage(
        "AI",
        "Loading AI model... The first download can take a while.",
        "ai-message"
    );

    try {
        engine = await CreateMLCEngine(MODEL, {
            initProgressCallback: (progress) => {
                console.log(progress);
                if (progress.text) {
                    loading.querySelector(".message-bubble").textContent =
                        progress.text;
                }
            }
        });

        loading.remove();

        addMessage(
            "AI",
            "Hello! I'm ready. Ask me anything.",
            "ai-message"
        );

        sendBtn.disabled = false;
        userInput.focus();

    } catch (error) {
        console.error(error);

        loading.querySelector(".message-bubble").textContent =
            "I couldn't load the AI. Try Chrome, Edge, or another browser with WebGPU enabled.";
    }
}

async function sendMessage() {
    const text = userInput.value.trim();

    if (!text || !engine) return;

    addMessage("You", text, "user-message");

    userInput.value = "";
    userInput.style.height = "auto";

    chatHistory.push({
        role: "user",
        content: text
    });

    sendBtn.disabled = true;

    const thinking = addMessage(
        "AI",
        "Thinking...",
        "ai-message"
    );

    try {
        const result = await engine.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content:
                        "You are a helpful, friendly AI assistant. Answer clearly and naturally."
                },
                ...chatHistory
            ],
            temperature: 0.7,
            max_tokens: 512
        });

        const answer =
            result.choices?.[0]?.message?.content ||
            "Sorry, I couldn't generate an answer.";

        thinking.remove();

        addMessage("AI", answer, "ai-message");

        chatHistory.push({
            role: "assistant",
            content: answer
        });

    } catch (error) {
        console.error(error);

        thinking.querySelector(".message-bubble").textContent =
            "Something went wrong. Please try again.";
    }

    sendBtn.disabled = false;
    userInput.focus();
}

sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height =
        `${userInput.scrollHeight}px`;
});

startAI();
