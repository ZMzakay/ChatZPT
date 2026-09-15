import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const chatMessages = document.getElementById("chatMessages");

let engine = null;
let chatHistory = [];
let aiReady = false;
let queuedMessage = null;

const MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";


// ========================================
// CREATE LOADING BAR
// ========================================

const loadingBox = document.createElement("div");

loadingBox.id = "aiLoading";

loadingBox.innerHTML = `
    <div class="ai-loading-title">
        ✨ Preparing AI
    </div>

    <div class="ai-loading-text">
        Downloading AI model...
    </div>

    <div class="progress-container">
        <div class="progress-bar" id="progressBar"></div>
    </div>

    <div class="progress-percent" id="progressPercent">
        0%
    </div>
`;

chatMessages.appendChild(loadingBox);


// ========================================
// LOADING BAR STYLE
// ========================================

const loadingStyle = document.createElement("style");

loadingStyle.textContent = `
#aiLoading {
    margin: 20px auto;
    padding: 20px;
    max-width: 600px;
    text-align: center;
    border-radius: 20px;
    background: #f5f5f7;
    font-family: Arial, sans-serif;
}

.ai-loading-title {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 8px;
}

.ai-loading-text {
    color: #777;
    font-size: 14px;
    margin-bottom: 15px;
}

.progress-container {
    width: 100%;
    height: 10px;
    background: #ddd;
    border-radius: 20px;
    overflow: hidden;
}

.progress-bar {
    width: 0%;
    height: 100%;
    background: #111;
    border-radius: 20px;
    transition: width 0.2s ease;
}

.progress-percent {
    margin-top: 8px;
    font-size: 13px;
    color: #777;
}
`;

document.head.appendChild(loadingStyle);


// ========================================
// ADD MESSAGE
// ========================================

function addMessage(sender, text, type) {

    const message = document.createElement("div");

    message.className = `message ${type}`;

    const avatar = document.createElement("div");

    avatar.className = "avatar";

    avatar.textContent =
        sender === "AI" ? "AI" : "You";

    const bubble = document.createElement("div");

    bubble.className = "message-bubble";

    bubble.textContent = text;

    message.appendChild(avatar);
    message.appendChild(bubble);

    chatMessages.appendChild(message);

    chatMessages.scrollTop =
        chatMessages.scrollHeight;

    return message;
}


// ========================================
// UPDATE LOADING BAR
// ========================================

function updateProgress(progress) {

    const bar =
        document.getElementById("progressBar");

    const percent =
        document.getElementById("progressPercent");

    const text =
        document.querySelector(".ai-loading-text");

    if (!bar) return;

    let value = 0;

    if (typeof progress.progress === "number") {
        value = progress.progress * 100;
    }

    value = Math.max(0, Math.min(100, value));

    bar.style.width = `${value}%`;

    percent.textContent =
        `${Math.round(value)}%`;

    if (progress.text) {
        text.textContent = progress.text;
    }
}


// ========================================
// START AI
// ========================================

async function startAI() {

    // User can type while AI loads
    sendBtn.disabled = false;

    try {

        engine = await CreateMLCEngine(
            MODEL,
            {
                initProgressCallback: updateProgress
            }
        );

        aiReady = true;

        // Remove loading box
        loadingBox.remove();

        addMessage(
            "AI",
            "Hello! I'm ready. Ask me anything.",
            "ai-message"
        );

        userInput.focus();

        // If user typed something while loading,
        // automatically send it now.
        if (queuedMessage) {

            const message = queuedMessage;

            queuedMessage = null;

            userInput.value = message;

            await sendMessage();
        }

    } catch (error) {

        console.error(error);

        const text =
            document.querySelector(".ai-loading-text");

        if (text) {
            text.textContent =
                "Couldn't load the AI. Try refreshing the page.";
        }

        const bar =
            document.getElementById("progressBar");

        if (bar) {
            bar.style.width = "100%";
        }
    }
}


// ========================================
// SEND MESSAGE
// ========================================

async function sendMessage() {

    const text =
        userInput.value.trim();

    if (!text) return;


    // If AI isn't ready yet,
    // save the message and wait.
    if (!aiReady) {

        queuedMessage = text;

        userInput.value = "";

        userInput.placeholder =
            "AI is preparing... your message is saved.";

        return;
    }


    addMessage(
        "You",
        text,
        "user-message"
    );

    userInput.value = "";

    userInput.style.height = "auto";

    chatHistory.push({
        role: "user",
        content: text
    });

    sendBtn.disabled = true;


    const thinking =
        addMessage(
            "AI",
            "Thinking...",
            "ai-message"
        );


    try {

        const result =
            await engine.chat.completions.create({

                messages: [
                    {
                        role: "system",
                        content:
                            "You are a helpful, friendly AI assistant. Give clear and useful answers."
                    },
                    ...chatHistory
                ],

                temperature: 0.7,

                max_tokens: 512
            });


        const answer =
            result.choices?.[0]?.message?.content ||
            "Sorry, I couldn't generate a response.";


        thinking.remove();


        addMessage(
            "AI",
            answer,
            "ai-message"
        );


        chatHistory.push({
            role: "assistant",
            content: answer
        });


    } catch (error) {

        console.error(error);

        thinking.querySelector(
            ".message-bubble"
        ).textContent =
            "Something went wrong. Please try again.";

    } finally {

        sendBtn.disabled = false;

        userInput.placeholder =
            "Message Assistant...";

        userInput.focus();
    }
}


// ========================================
// SEND BUTTON
// ========================================

sendBtn.addEventListener(
    "click",
    sendMessage
);


// ========================================
// ENTER TO SEND
// ========================================

userInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();
        }
    }
);


// ========================================
// TEXTAREA AUTO RESIZE
// ========================================

userInput.addEventListener(
    "input",
    () => {

        userInput.style.height = "auto";

        userInput.style.height =
            `${userInput.scrollHeight}px`;
    }
);


// ========================================
// START
// ========================================

startAI();
