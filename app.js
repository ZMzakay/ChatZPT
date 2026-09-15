import {
    CreateWebWorkerMLCEngine
} from "https://esm.run/@mlc-ai/web-llm";


// ========================================
// MODELS
// ========================================

const MODELS = {
    "1.5B":
        "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",

    "1B":
        "Llama-3.2-1B-Instruct-q4f16_1-MLC",

    "0.5B":
        "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",

    "0.1B":
        "SmolLM2-135M-Instruct-q0f16-MLC"
};


// ========================================
// DEVICE DETECTION
// ========================================

const isAppleMobile =
    /iPhone|iPad|iPod/i.test(
        navigator.userAgent
    );

const isAndroid =
    /Android/i.test(
        navigator.userAgent
    );


// ========================================
// DEFAULT MODEL
// ========================================
//
// PC      -> 1B
// iPhone  -> 0.5B
// Android -> 0.5B
//

const DEFAULT_MODEL =
    isAppleMobile || isAndroid
        ? "0.5B"
        : "1B";


// ========================================
// PERFORMANCE SETTINGS
// ========================================

const MAX_HISTORY = 4;

const MAX_INPUT_LENGTH = 2500;

const MAX_TOKENS = 250;


// ========================================
// ELEMENTS
// ========================================

const messages =
    document.getElementById(
        "chatMessages"
    );

const input =
    document.getElementById(
        "userInput"
    );

const sendBtn =
    document.getElementById(
        "sendBtn"
    );

const newChatBtn =
    document.getElementById(
        "newChatBtn"
    );


// ========================================
// STATE
// ========================================

let engine = null;

let worker = null;

let history = [];

let generating = false;

let loading = false;

let currentModel = null;

let loadingRequest = 0;


// ========================================
// MESSAGE
// ========================================

function addMessage(
    text,
    role
) {

    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.className =
        `message ${role}`;


    const avatar =
        document.createElement(
            "div"
        );

    avatar.className =
        "avatar";

    avatar.textContent =
        role === "user"
            ? "U"
            : "AI";


    const bubble =
        document.createElement(
            "div"
        );

    bubble.className =
        "bubble";

    bubble.textContent =
        text;


    wrapper.appendChild(
        avatar
    );

    wrapper.appendChild(
        bubble
    );

    messages.appendChild(
        wrapper
    );


    messages.scrollTop =
        messages.scrollHeight;


    return bubble;
}


// ========================================
// LOADING UI
// ========================================

function createLoadingUI(
    modelName
) {

    const box =
        document.createElement(
            "div"
        );

    box.id =
        "aiLoading";

    box.className =
        "ai-loading";


    box.innerHTML = `

        <div class="loading-title">
            Loading ${modelName}...
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

            Starting AI...

        </div>

        <div
            id="loadingSpeed"
            class="loading-speed">

            Loading model into your browser.
            It will be cached for future visits.

        </div>

    `;


    messages.appendChild(
        box
    );

    messages.scrollTop =
        messages.scrollHeight;


    return box;
}


// ========================================
// BUTTON STATE
// ========================================

function updateModelButtons() {

    const buttons =
        document.querySelectorAll(
            "[data-model]"
        );


    buttons.forEach(
        button => {

            const name =
                button.dataset.model;


            button.classList.toggle(
                "active-model",
                name === currentModel
            );


            // IMPORTANT:
            // Buttons stay enabled
            // while loading so the user
            // can change model.

            button.disabled =
                generating;

        }
    );
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
// STOP MODEL
// ========================================

function stopModel() {

    if (worker) {

        try {
            worker.terminate();
        }
        catch (_) {}
    }


    worker = null;

    engine = null;
}


// ========================================
// LOAD MODEL
// ========================================

async function loadModel(
    modelName
) {

    // ------------------------------------
    // NEW REQUEST ID
    // ------------------------------------

    const request =
        ++loadingRequest;


    loading = true;

    currentModel =
        modelName;


    updateModelButtons();


    // ------------------------------------
    // STOP OLD MODEL
    // ------------------------------------

    stopModel();


    // ------------------------------------
    // CLEAR OLD LOADING BOX
    // ------------------------------------

    const oldLoading =
        document.getElementById(
            "aiLoading"
        );


    if (oldLoading) {
        oldLoading.remove();
    }


    // ------------------------------------
    // CREATE LOADING UI
    // ------------------------------------

    const loadingBox =
        createLoadingUI(
            modelName
        );


    input.disabled = true;

    sendBtn.disabled = true;


    try {

        worker =
            createWorker();


        const modelID =
            MODELS[modelName];


        engine =
            await CreateWebWorkerMLCEngine(
                worker,
                modelID,
                {

                    initProgressCallback:
                        progress => {

                            // If the user selected
                            // another model while
                            // this one was loading,
                            // ignore this request.

                            if (
                                request !==
                                loadingRequest
                            ) {
                                return;
                            }


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


        // --------------------------------
        // CANCELLED LOAD
        // --------------------------------

        if (
            request !==
            loadingRequest
        ) {

            try {
                worker.terminate();
            }
            catch (_) {}

            return false;
        }


        // --------------------------------
        // SUCCESS
        // --------------------------------

        currentModel =
            modelName;


        loading = false;


        if (loadingBox) {
            loadingBox.remove();
        }


        input.disabled = false;

        sendBtn.disabled = false;


        input.placeholder =
            "Message Assistant...";


        updateModelButtons();


        addMessage(
            `${modelName} AI is ready.`,
            "assistant"
        );


        return true;


    } catch (error) {

        console.error(
            `Model ${modelName} failed:`,
            error
        );


        // Ignore an old request
        if (
            request !==
            loadingRequest
        ) {
            return false;
        }


        stopModel();


        loading = false;


        if (loadingBox) {

            loadingBox.innerHTML = `

                <strong>
                    ${modelName} couldn't load.
                </strong>

                <br><br>

                Try a smaller model using
                the buttons above.

            `;
        }


        updateModelButtons();


        return false;
    }
}


// ========================================
// MODEL BUTTONS
// ========================================

document
    .querySelectorAll(
        "[data-model]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    const model =
                        button.dataset.model;


                    // Don't allow model changes
                    // during generation.

                    if (generating) {
                        return;
                    }


                    // Same model
                    if (
                        model ===
                        currentModel &&
                        engine
                    ) {
                        return;
                    }


                    // This is important:
                    // loadingRequest changes,
                    // causing the previous load
                    // to be ignored.

                    await loadModel(
                        model
                    );
                }
            );
        }
    );


// ========================================
// SEND MESSAGE
// ========================================

async function sendMessage() {

    if (
        !engine ||
        loading ||
        generating
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


    // Keep memory small
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
You are Assistant, a helpful and intelligent AI.

Answer the user's question directly.

Be accurate and honest.

Do not invent information.

If you do not know something, say so.

Remember the recent conversation.

Keep answers reasonably concise.

Use lists when useful.

Give working code when requested.
`;


        const response =
            await engine.chat.completions.create({

                messages: [

                    {
                        role:
                            "system",

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
        // STREAM OPTIMIZATION
        // --------------------------------

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


            // Don't update the DOM
            // for every token.
            //
            // This prevents the browser
            // from spending too much time
            // rendering while the model
            // is generating.

            if (
                now -
                lastUpdate >=
                60
            ) {

                aiBubble.textContent =
                    answer;


                messages.scrollTop =
                    messages.scrollHeight;


                lastUpdate =
                    now;
            }
        }


        // Final update

        aiBubble.textContent =
            answer;


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
            "The AI had trouble generating that answer. Please try again.";
    }


    generating = false;


    sendBtn.disabled =
        !engine;


    updateModelButtons();


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
// ENTER
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


        messages.innerHTML =
            "";


        addMessage(
            `New chat started. ${currentModel || ""} AI is ready.`,
            "assistant"
        );
    }
);


// ========================================
// START
// ========================================

input.disabled = true;

sendBtn.disabled = true;


// Set the correct default
// visually immediately.

currentModel =
    DEFAULT_MODEL;

updateModelButtons();


// Start default model.

loadModel(
    DEFAULT_MODEL
);
