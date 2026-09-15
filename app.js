import {
    CreateWebWorkerMLCEngine
} from "https://esm.run/@mlc-ai/web-llm";


// ========================================
// MODELS
// ========================================

// ALWAYS TRY 1.5B FIRST
const PRIMARY_MODEL =
    "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

// FALLBACK IF 1.5B FAILS
const FALLBACK_MODEL =
    "Llama-3.2-1B-Instruct-q4f16_1-MLC";


// ========================================
// ELEMENTS
// ========================================

const messages =
    document.getElementById("chatMessages");

const input =
    document.getElementById("userInput");

const sendBtn =
    document.getElementById("sendBtn");

const newChatBtn =
    document.getElementById("newChatBtn");


let engine = null;
let worker = null;
let history = [];
let generating = false;
let currentModel = PRIMARY_MODEL;


// ========================================
// MESSAGE UI
// ========================================

function addMessage(text, role) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        `message ${role}`;


    const avatar =
        document.createElement("div");

    avatar.className =
        "avatar";

    avatar.textContent =
        role === "user"
            ? "U"
            : "AI";


    const bubble =
        document.createElement("div");

    bubble.className =
        "bubble";

    bubble.textContent =
        text;


    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);

    messages.appendChild(wrapper);

    messages.scrollTop =
        messages.scrollHeight;


    return bubble;
}


// ========================================
// LOADING UI
// ========================================

function createLoadingUI() {

    const box =
        document.createElement("div");

    box.id =
        "aiLoading";

    box.style.padding =
        "14px";

    box.style.margin =
        "10px";

    box.style.borderRadius =
        "12px";

    box.style.background =
        "#f1f1f1";

    box.style.fontSize =
        "14px";


    box.innerHTML = `

        <div id="loadingText">
            Starting AI...
        </div>

        <div style="
            width:100%;
            height:8px;
            background:#ddd;
            border-radius:10px;
            overflow:hidden;
            margin-top:8px;
        ">

            <div id="loadingBar" style="
                width:0%;
                height:100%;
                background:#666;
                transition:width .15s;
            "></div>

        </div>

        <div id="loadingModel"
             style="
                margin-top:7px;
                font-size:12px;
                opacity:.7;
             ">
            Preparing model...
        </div>
    `;


    messages.appendChild(box);

    messages.scrollTop =
        messages.scrollHeight;


    return box;
}


// ========================================
// READY STATE
// ========================================

function setReady() {

    input.disabled = false;

    sendBtn.disabled = false;

    input.placeholder =
        "Message Assistant...";

    input.focus();
}


// ========================================
// CREATE WORKER
// ========================================

function createWorker() {

    return new Worker(
        "./worker.js",
        {
            type: "module"
        }
    );
}


// ========================================
// LOAD MODEL
// ========================================

async function loadModel(
    modelName,
    loadingBox
) {

    currentModel =
        modelName;


    const loadingModel =
        document.getElementById(
            "loadingModel"
        );


    if (loadingModel) {

        loadingModel.textContent =
            `Model: ${modelName}`;
    }


    // Create a fresh worker
    // every time we try a model.
    worker =
        createWorker();


    try {

        engine =
            await CreateWebWorkerMLCEngine(
                worker,
                modelName,
                {

                    // This helps WebLLM
                    // show download progress.
                    initProgressCallback:
                        (progress) => {

                            const percent =
                                Math.max(
                                    0,
                                    Math.min(
                                        100,
                                        Math.round(
                                            progress.progress *
                                            100
                                        )
                                    )
                                );


                            const bar =
                                document.getElementById(
                                    "loadingBar"
                                );


                            const text =
                                document.getElementById(
                                    "loadingText"
                                );


                            if (bar) {

                                bar.style.width =
                                    `${percent}%`;
                            }


                            if (text) {

                                text.textContent =
                                    progress.text ||
                                    `Loading AI... ${percent}%`;
                            }
                        }
                }
            );


        return true;

    } catch (error) {

        console.error(
            `Failed to load ${modelName}:`,
            error
        );


        try {

            worker.terminate();

        } catch (_) {}


        worker =
            null;

        engine =
            null;


        return false;
    }
}


// ========================================
// START AI
// ========================================

async function startAI() {

    const loadingBox =
        createLoadingUI();


    // Disable chat while loading
    input.disabled = true;
    sendBtn.disabled = true;


    // ------------------------------------
    // TRY 1.5B
    // ------------------------------------

    const primaryLoaded =
        await loadModel(
            PRIMARY_MODEL,
            loadingBox
        );


    if (primaryLoaded) {

        if (loadingBox) {
            loadingBox.remove();
        }


        setReady();


        addMessage(
            "I'm ready! Running the 1.5B AI model.",
            "assistant"
        );


        return;
    }


    // ------------------------------------
    // 1.5B FAILED → TRY 1B
    // ------------------------------------

    if (loadingBox) {

        const text =
            document.getElementById(
                "loadingText"
            );

        const model =
            document.getElementById(
                "loadingModel"
            );


        if (text) {

            text.textContent =
                "1.5B was too heavy. Switching to 1B...";
        }


        if (model) {

            model.textContent =
                "Trying fallback model...";
        }
    }


    const fallbackLoaded =
        await loadModel(
            FALLBACK_MODEL,
            loadingBox
        );


    if (fallbackLoaded) {

        if (loadingBox) {
            loadingBox.remove();
        }


        setReady();


        addMessage(
            "I'm ready! The 1.5B model was too heavy for this device, so I'm using the faster 1B model.",
            "assistant"
        );


        return;
    }


    // ------------------------------------
    // EVERYTHING FAILED
    // ------------------------------------

    if (loadingBox) {

        loadingBox.innerHTML = `

            <strong>
                AI couldn't start.
            </strong>

            <br><br>

            Your device may not have enough
            memory or WebGPU may not be available.

            <br><br>

            Try closing other browser tabs
            and refreshing the page.
        `;
    }
}


// ========================================
// SEND MESSAGE
// ========================================

async function sendMessage() {

    if (
        !engine ||
        generating ||
        !input.value.trim()
    ) {
        return;
    }


    const text =
        input.value
            .trim()
            .slice(0, 3000);


    input.value = "";


    addMessage(
        text,
        "user"
    );


    history.push({
        role: "user",
        content: text
    });


    // Keep memory manageable
    if (history.length > 6) {

        history =
            history.slice(-6);
    }


    generating = true;


    sendBtn.disabled = true;
    input.disabled = true;


    const aiBubble =
        addMessage(
            "",
            "assistant"
        );


    try {

        const systemPrompt = `

You are Assistant, a smart, helpful and friendly AI.

Rules:

- Understand the user's question before answering.
- Give accurate and useful answers.
- Never intentionally make up facts.
- If you are unsure, say that you are unsure.
- Remember the conversation context.
- Answer directly.
- Give working code when requested.
- Explain difficult things simply.
- Be friendly.
- Avoid unnecessary repetition.
- Use short paragraphs.
- Use lists when useful.

`;


        const response =
            await engine.chat.completions.create({

                messages: [
                    {
                        role: "system",
                        content:
                            systemPrompt
                    },

                    ...history
                ],

                temperature: 0.45,

                max_tokens: 350,

                stream: true
            });


        let answer = "";


        for await (
            const chunk of response
        ) {

            const token =
                chunk
                    .choices?.[0]
                    ?.delta
                    ?.content;


            if (token) {

                answer += token;

                aiBubble.textContent =
                    answer;


                messages.scrollTop =
                    messages.scrollHeight;
            }
        }


        history.push({
            role: "assistant",
            content: answer
        });


        if (history.length > 6) {

            history =
                history.slice(-6);
        }


    } catch (error) {

        console.error(
            "Generation error:",
            error
        );


        aiBubble.textContent =
            "Sorry, the AI ran into a problem. Try again.";
    }


    generating = false;

    sendBtn.disabled = false;
    input.disabled = false;

    input.focus();
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

input.addEventListener(
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
// NEW CHAT
// ========================================

newChatBtn.addEventListener(
    "click",
    () => {

        history = [];

        messages.innerHTML = "";

        addMessage(
            "New chat started. How can I help?",
            "assistant"
        );
    }
);


// ========================================
// START IMMEDIATELY
// ========================================

input.disabled = true;
sendBtn.disabled = true;

startAI();
