import {
    CreateWebWorkerMLCEngine
} from "https://esm.run/@mlc-ai/web-llm";

const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const chatMessages = document.getElementById("chatMessages");

let engine = null;
let loading = true;
let busy = false;

let chatHistory = [];


// =====================================================
// PICK A SMALL MODEL
// =====================================================

// Phones get the tiny model.
// Computers get the slightly better 360M model.

const isPhone =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const MODEL = isPhone
    ? "SmolLM2-135M-Instruct-q0f16-MLC"
    : "SmolLM2-360M-Instruct-q4f16_1-MLC";


// =====================================================
// MESSAGE UI
// =====================================================

function addMessage(sender, text, type) {

    const message = document.createElement("div");

    message.className =
        `message ${type}`;

    const avatar =
        document.createElement("div");

    avatar.className = "avatar";

    avatar.textContent =
        sender === "AI" ? "AI" : "You";

    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble";

    bubble.textContent = text;

    message.appendChild(avatar);
    message.appendChild(bubble);

    chatMessages.appendChild(message);

    chatMessages.scrollTop =
        chatMessages.scrollHeight;

    return message;
}


// =====================================================
// LOADING UI
// =====================================================

const loadingBox =
    document.createElement("div");

loadingBox.id = "aiLoading";

loadingBox.innerHTML = `
    <div class="ai-load-title">
        ✨ Preparing Assistant
    </div>

    <div
        id="aiLoadText"
        class="ai-load-text"
    >
        Starting AI...
    </div>

    <div class="ai-progress">
        <div
            id="aiProgressBar"
            class="ai-progress-bar"
        ></div>
    </div>

    <div
        id="aiProgressPercent"
        class="ai-progress-percent"
    >
        0%
    </div>
`;

chatMessages.appendChild(
    loadingBox
);


// =====================================================
// LOADING CSS
// =====================================================

const style =
    document.createElement("style");

style.textContent = `

#aiLoading {
    margin: 18px auto;
    padding: 18px;
    width: min(90%, 560px);
    box-sizing: border-box;
    text-align: center;
    background: #f5f5f7;
    border-radius: 18px;
}

.ai-load-title {
    font-size: 19px;
    font-weight: 700;
    margin-bottom: 7px;
}

.ai-load-text {
    font-size: 13px;
    color: #777;
    margin-bottom: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ai-progress {
    height: 8px;
    width: 100%;
    background: #dedede;
    border-radius: 20px;
    overflow: hidden;
}

.ai-progress-bar {
    height: 100%;
    width: 0%;
    background: #111;
    border-radius: 20px;
    transition: width .15s linear;
}

.ai-progress-percent {
    margin-top: 7px;
    font-size: 12px;
    color: #888;
}

`;

document.head.appendChild(style);


// =====================================================
// PROGRESS
// =====================================================

function updateProgress(progress) {

    const bar =
        document.getElementById(
            "aiProgressBar"
        );

    const percent =
        document.getElementById(
            "aiProgressPercent"
        );

    const text =
        document.getElementById(
            "aiLoadText"
        );

    if (!bar) return;

    if (
        typeof progress.progress ===
        "number"
    ) {

        const value =
            Math.max(
                0,
                Math.min(
                    100,
                    progress.progress * 100
                )
            );

        bar.style.width =
            `${value}%`;

        percent.textContent =
            `${Math.round(value)}%`;
    }

    if (progress.text) {
        text.textContent =
            progress.text;
    }
}


// =====================================================
// START AI
// =====================================================

async function startAI() {

    try {

        const worker =
            new Worker(
                "./worker.js",
                {
                    type: "module"
                }
            );

        engine =
            await CreateWebWorkerMLCEngine(
                worker,
                MODEL,
                {
                    initProgressCallback:
                        updateProgress
                }
            );


        loading = false;

        loadingBox.remove();


        addMessage(
            "AI",
            "Hello! I'm ready. ✨",
            "ai-message"
        );


        userInput.disabled = false;

        sendBtn.disabled = false;

        userInput.focus();


    } catch (error) {

        console.error(error);

        const text =
            document.getElementById(
                "aiLoadText"
            );

        if (text) {

            text.textContent =
                "AI could not start. Try Chrome or Safari with WebGPU enabled.";
        }
    }
}


// =====================================================
// SEND MESSAGE
// =====================================================

async function sendMessage() {

    if (busy) return;

    const text =
        userInput.value.trim();

    if (!text) return;


    // Don't allow huge messages.
    const cleanText =
        text.slice(0, 2000);


    userInput.value = "";

    userInput.style.height =
        "auto";


    addMessage(
        "You",
        cleanText,
        "user-message"
    );


    chatHistory.push({
        role: "user",
        content: cleanText
    });


    // Keep memory small.
    if (chatHistory.length > 6) {

        chatHistory =
            chatHistory.slice(-6);
    }


    if (loading) {

        addMessage(
            "AI",
            "I'm still loading — almost ready!",
            "ai-message"
        );

        return;
    }


    busy = true;

    sendBtn.disabled = true;


    const aiMessage =
        addMessage(
            "AI",
            "",
            "ai-message"
        );


    const bubble =
        aiMessage.querySelector(
            ".message-bubble"
        );


    try {

        const stream =
            await engine.chat.completions.create({

                messages: [
                    {
                        role: "system",
                        content:
                            "You are a helpful, concise AI assistant. Give short, useful answers."
                    },

                    ...chatHistory
                ],

                temperature: 0.6,

                max_tokens: 180,

                stream: true
            });


        let answer = "";


        for await (
            const chunk of stream
        ) {

            const piece =
                chunk.choices?.[0]
                    ?.delta?.content || "";


            if (!piece) continue;


            answer += piece;


            bubble.textContent =
                answer;


            chatMessages.scrollTop =
                chatMessages.scrollHeight;
        }


        if (answer) {

            chatHistory.push({
                role: "assistant",
                content: answer
            });


            if (
                chatHistory.length > 6
            ) {

                chatHistory =
                    chatHistory.slice(-6);
            }
        }


    } catch (error) {

        console.error(error);

        bubble.textContent =
            "Sorry, something went wrong. Try again.";
    }


    busy = false;

    sendBtn.disabled = false;

    userInput.focus();
}


// =====================================================
// SEND BUTTON
// =====================================================

sendBtn.addEventListener(
    "click",
    sendMessage
);


// =====================================================
// ENTER TO SEND
// =====================================================

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


// =====================================================
// TEXTAREA
// =====================================================

userInput.addEventListener(
    "input",
    () => {

        userInput.style.height =
            "auto";

        userInput.style.height =
            `${userInput.scrollHeight}px`;
    }
);


// =====================================================
// START
// =====================================================

userInput.disabled = true;

sendBtn.disabled = true;

startAI();
