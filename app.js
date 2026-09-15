import {
    CreateWebWorkerMLCEngine
} from "https://esm.run/@mlc-ai/web-llm";


// =====================================================
// ELEMENTS
// =====================================================

const userInput =
    document.getElementById("userInput");

const sendBtn =
    document.getElementById("sendBtn");

const chatMessages =
    document.getElementById("chatMessages");


// =====================================================
// AI SETTINGS
// =====================================================

let engine = null;

let aiReady = false;

let busy = false;

let chatHistory = [];


// =====================================================
// DEVICE DETECTION
// =====================================================

// Phones use the smaller model.
// Computers use the stronger model.

const isPhone =
    /Android|iPhone|iPad|iPod/i.test(
        navigator.userAgent
    );


// =====================================================
// MODEL
// =====================================================

const MODEL = isPhone
    ? "Qwen2.5-0.5B-Instruct-q4f16_1-MLC"
    : "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";


// =====================================================
// LOADING BOX
// =====================================================

const loadingBox =
    document.createElement("div");

loadingBox.id = "aiLoading";

loadingBox.innerHTML = `
    <div class="ai-load-title">
        ✨ Preparing Assistant
    </div>

    <div id="aiLoadText" class="ai-load-text">
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
// LOADING STYLE
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
// ADD MESSAGE
// =====================================================

function addMessage(
    sender,
    text,
    type
) {

    const message =
        document.createElement("div");

    message.className =
        `message ${type}`;


    const avatar =
        document.createElement("div");

    avatar.className =
        "avatar";


    avatar.textContent =
        sender === "AI"
            ? "AI"
            : "You";


    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble";


    bubble.textContent =
        text;


    message.appendChild(
        avatar
    );

    message.appendChild(
        bubble
    );


    chatMessages.appendChild(
        message
    );


    chatMessages.scrollTop =
        chatMessages.scrollHeight;


    return message;
}


// =====================================================
// LOADING PROGRESS
// =====================================================

function updateProgress(
    progress
) {

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

        console.log(
            "Starting AI:",
            MODEL
        );


        // Create background worker

        const worker =
            new Worker(
                "./worker.js",
                {
                    type: "module"
                }
            );


        // Load model

        engine =
            await CreateWebWorkerMLCEngine(
                worker,
                MODEL,
                {
                    initProgressCallback:
                        updateProgress
                }
            );


        // AI is ready

        aiReady = true;


        // Remove loading screen

        loadingBox.remove();


        // Welcome message

        addMessage(
            "AI",
            "Hello! I'm ready. ✨",
            "ai-message"
        );


        userInput.disabled =
            false;

        sendBtn.disabled =
            false;


        userInput.placeholder =
            "Message Assistant...";


        userInput.focus();


        console.log(
            "AI ready!"
        );


    } catch (error) {

        console.error(
            "AI failed:",
            error
        );


        const loadText =
            document.getElementById(
                "aiLoadText"
            );


        if (loadText) {

            loadText.textContent =
                "Couldn't load the AI. Try refreshing the page.";
        }


        const bar =
            document.getElementById(
                "aiProgressBar"
            );


        if (bar) {

            bar.style.width =
                "100%";
        }
    }
}


// =====================================================
// SEND MESSAGE
// =====================================================

async function sendMessage() {

    // Prevent double messages

    if (busy) return;


    const text =
        userInput.value.trim();


    if (!text) return;


    // Don't allow enormous messages

    const cleanText =
        text.slice(0, 3000);


    // Clear input

    userInput.value = "";

    userInput.style.height =
        "auto";


    // Show user message

    addMessage(
        "You",
        cleanText,
        "user-message"
    );


    // Add to history

    chatHistory.push({
        role: "user",
        content: cleanText
    });


    // Keep only recent messages.
    // This makes generation faster.

    if (
        chatHistory.length > 6
    ) {

        chatHistory =
            chatHistory.slice(-6);
    }


    // AI still loading

    if (!aiReady) {

        addMessage(
            "AI",
            "I'm still preparing. Your message will be ready shortly!",
            "ai-message"
        );

        return;
    }


    busy = true;

    sendBtn.disabled =
        true;


    // Create empty AI message

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

        // Generate response

        const stream =
            await engine
                .chat
                .completions
                .create({

                    messages: [

                        {
                            role: "system",

                            content: `
You are Assistant, a smart, helpful and friendly AI.

Your rules:

- Understand the user's question before answering.
- Give accurate and useful answers.
- Never intentionally make up facts.
- If you are unsure, say that you are unsure.
- Remember the conversation context.
- Answer directly instead of repeating the question.
- Give working code when the user asks for code.
- Explain difficult things simply.
- Be friendly but not overly verbose.
- Use short paragraphs.
- Use lists when they make the answer clearer.
`
                        },

                        ...chatHistory

                    ],

                    temperature: 0.45,

                    max_tokens: 350,

                    stream: true
                });


        let answer = "";


        // Display response as it generates

        for await (
            const chunk of stream
        ) {

            const piece =
                chunk
                    .choices?.[0]
                    ?.delta?.content || "";


            if (!piece) continue;


            answer += piece;


            bubble.textContent =
                answer;


            chatMessages.scrollTop =
                chatMessages.scrollHeight;
        }


        // Save AI response

        if (answer) {

            chatHistory.push({
                role: "assistant",
                content: answer
            });


            // Keep history small

            if (
                chatHistory.length > 6
            ) {

                chatHistory =
                    chatHistory.slice(-6);
            }
        }


    } catch (error) {

        console.error(
            "Generation error:",
            error
        );


        bubble.textContent =
            "Sorry, something went wrong. Please try again.";
    }


    busy = false;

    sendBtn.disabled =
        false;

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
// AUTO RESIZE INPUT
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
// INITIAL STATE
// =====================================================

userInput.disabled =
    true;

sendBtn.disabled =
    true;

userInput.placeholder =
    "Preparing AI...";


// =====================================================
// START
// =====================================================

startAI();
