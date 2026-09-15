import {
    CreateWebWorkerMLCEngine
} from "https://esm.run/@mlc-ai/web-llm";


// ========================================
// MODELS
// ========================================

const MODELS = {
    "1.5B": "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",

    "1B": "Llama-3.2-1B-Instruct-q4f16_1-MLC",

    "0.5B": "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",

    // ~0.135B, closest lightweight model
    "0.1B": "SmolLM2-135M-Instruct-q0f16-MLC"
};


// ========================================
// SETTINGS
// ========================================

const MAX_HISTORY = 6;
const MAX_INPUT_LENGTH = 3000;
const MAX_TOKENS = 300;


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


// ========================================
// STATE
// ========================================

let engine = null;
let worker = null;

let history = [];

let generating = false;
let loading = false;

let currentModel = null;


// ========================================
// ADD MESSAGE
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
// LOADING BOX
// ========================================

function createLoadingUI(modelName) {

    const box =
        document.createElement("div");

    box.id =
        "aiLoading";

    box.className =
        "ai-loading";


    box.innerHTML = `

        <div class="loading-title">
            Loading ${modelName} AI...
        </div>

        <div class="loading-bar-container">
            <div
                id="loadingBar"
                class="loading-bar">
            </div>
        </div>

        <div
            id="loadingText"
            class="loading-text">
            Starting...
        </div>

        <div
            id="loadingSpeed"
            class="loading-speed">
            The first load can take a while.
            Future loads should be faster because
            your browser caches the model.
        </div>
    `;


    messages.appendChild(box);

    messages.scrollTop =
        messages.scrollHeight;


    return box;
}


// ========================================
// UPDATE BUTTONS
// ========================================

function updateModelButtons() {

    const buttons =
        document.querySelectorAll(
            "[data-model]"
        );


    buttons.forEach(button => {

        const name =
            button.dataset.model;


        if (name === currentModel) {

            button.classList.add(
                "active-model"
            );

        } else {

            button.classList.remove(
                "active-model"
            );
        }


        button.disabled =
            loading ||
            generating;
    });
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
// STOP CURRENT ENGINE
// ========================================

function stopCurrentEngine() {

    try {

        if (worker) {
            worker.terminate();
        }

    } catch (_) {}


    worker = null;
    engine = null;
}


// ========================================
// LOAD MODEL
// ========================================

async function loadModel(modelName) {

    if (loading) {
        return false;
    }


    loading = true;

    updateModelButtons();


    const loadingBox =
        createLoadingUI(modelName);


    const modelID =
        MODELS[modelName];


    try {

        // Stop previous model
        stopCurrentEngine();


        worker =
            createWorker();


        const startTime =
            performance.now();


        engine =
            await CreateWebWorkerMLCEngine(
                worker,
                modelID,
                {

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
                                    `Loading ${percent}%`;
                            }
                        }
                }
            );


        currentModel =
            modelName;


        const seconds =
            (
                (performance.now() -
                    startTime) /
                1000
            ).toFixed(1);


        if (loadingBox) {

            loadingBox.remove();
        }


        loading = false;

        updateModelButtons();


        input.disabled = false;
        sendBtn.disabled = false;

        input.placeholder =
            "Message Assistant...";


        addMessage(
            `${modelName} AI is ready.`,
            "assistant"
        );


        return true;

    } catch (error) {

        console.error(
            `Failed to load ${modelName}:`,
            error
        );


        stopCurrentEngine();


        loading = false;

        updateModelButtons();


        if (loadingBox) {

            loadingBox.innerHTML = `

                <strong>
                    Couldn't load ${modelName}.
                </strong>

                <br><br>

                Trying a smaller model may
                work better on this device.

            `;
        }


        return false;
    }
}


// ========================================
// START AI
// ========================================

async function startAI() {

    input.disabled = true;
    sendBtn.disabled = true;


    // Try 1.5B first
    const success =
        await loadModel("1.5B");


    // Automatically fall back if needed
    if (!success) {

        await loadModel("1B");
    }
}


// ========================================
// SEND MESSAGE
// ========================================

async function sendMessage() {

    if (
        !engine ||
        generating ||
        loading
    ) {
        return;
    }


    const text =
        input.value
            .trim()
            .slice(
                0,
                MAX_INPUT_LENGTH
            );


    if (!text) {
        return;
    }


    input.value = "";


    addMessage(
        text,
        "user"
    );


    history.push({
        role: "user",
        content: text
    });


    // Keep context small.
    // This significantly reduces
    // repeated computation.
    if (
        history.length >
        MAX_HISTORY
    ) {

        history =
            history.slice(
                -MAX_HISTORY
            );
    }


    generating = true;

    sendBtn.disabled = true;

    updateModelButtons();


    const aiBubble =
        addMessage(
            "",
            "assistant"
        );


    try {

        const systemPrompt = `
You are Assistant, a smart, helpful and friendly AI.

Rules:
- Understand the user's question.
- Answer directly.
- Be accurate.
- Never intentionally make up facts.
- If unsure, say so.
- Remember recent conversation context.
- Give working code when requested.
- Explain difficult things simply.
- Avoid unnecessary repetition.
- Use short paragraphs.
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

                temperature: 0.4,

                max_tokens:
                    MAX_TOKENS,

                stream: true
            });


        let answer = "";


        // --------------------------------
        // PERFORMANCE OPTIMIZATION
        // --------------------------------
        //
        // Don't update the DOM for every
        // single token. Doing that hundreds
        // of times per second can cause
        // scrolling and lag.
        //

        let pendingUpdate = false;

        let lastUpdate =
            performance.now();


        for await (
            const chunk of response
        ) {

            const token =
                chunk
                    .choices?.[0]
                    ?.delta
                    ?.content;


            if (!token) {
                continue;
            }


            answer += token;


            const now =
                performance.now();


            // Update roughly every 50ms
            // instead of every token.
            if (
                now -
                lastUpdate >=
                50
            ) {

                aiBubble.textContent =
                    answer;


                messages.scrollTop =
                    messages.scrollHeight;


                lastUpdate =
                    now;

                pendingUpdate =
                    false;

            } else {

                pendingUpdate =
                    true;
            }
        }


        // Final update
        if (pendingUpdate) {

            aiBubble.textContent =
                answer;

            messages.scrollTop =
                messages.scrollHeight;
        }


        history.push({
            role: "assistant",
            content: answer
        });


        if (
            history.length >
            MAX_HISTORY
        ) {

            history =
                history.slice(
                    -MAX_HISTORY
                );
        }


    } catch (error) {

        console.error(
            "Generation error:",
            error
        );


        aiBubble.textContent =
            "The AI encountered an error. Try again.";
    }


    generating = false;

    sendBtn.disabled = false;

    updateModelButtons();

    input.focus();
}


// ========================================
// MODEL SWITCHING
// ========================================

document
    .querySelectorAll("[data-model]")
    .forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                if (
                    loading ||
                    generating
                ) {
                    return;
                }


                const model =
                    button.dataset.model;


                if (
                    model === currentModel
                ) {
                    return;
                }


                await loadModel(model);
            }
        );
    });


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
    event => {

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

        if (generating) {
            return;
        }


        history = [];

        messages.innerHTML = "";


        addMessage(
            "New chat started. How can I help?",
            "assistant"
        );
    }
);


// ========================================
// START
// ========================================

input.disabled = true;
sendBtn.disabled = true;

startAI();
