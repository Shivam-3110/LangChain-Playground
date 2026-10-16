
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatContainer = document.getElementById("chatContainer");
const sendButton = document.getElementById("sendButton");

const CONVERSATION_KEY = "restaurantConversationId";



function getConversationId() {
    let conversationId = localStorage.getItem(CONVERSATION_KEY);

    if (!conversationId) {
        conversationId = crypto.randomUUID();

        localStorage.setItem(
            CONVERSATION_KEY,
            conversationId
        );
    }

    return conversationId;
}

const conversationId = getConversationId();
console.log(conversationId);




function addMessage(message, type) {
    const messageDiv = document.createElement("div");

    messageDiv.classList.add("message", type);

    const avatar = document.createElement("div");

    avatar.classList.add("avatar");
    avatar.textContent = type === "user" ? "👤" : "🤖";

    const content = document.createElement("div");

    content.classList.add("message-content");

    // Messages are escaped before being inserted into the DOM.
    content.innerHTML =
        type === "user"
            ? escapeHTML(message)
            : formatResponse(message);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    chatContainer.appendChild(messageDiv);

    scrollToBottom();
}




function showLoading() {
    const loading = document.createElement("div");

    loading.classList.add("message", "bot");
    loading.id = "loadingMessage";

    const avatar = document.createElement("div");
    avatar.classList.add("avatar");
    avatar.textContent = "🤖";

    const content = document.createElement("div");
    content.classList.add("message-content");

    const typing = document.createElement("span");
    typing.classList.add("typing");
    typing.textContent = "Food AI is thinking...";

    content.appendChild(typing);
    loading.appendChild(avatar);
    loading.appendChild(content);

    chatContainer.appendChild(loading);

    scrollToBottom();
}


function removeLoading() {
    const loading = document.getElementById("loadingMessage");

    if (loading) {
        loading.remove();
    }
}



async function sendMessage(message) {
    if (!message.trim()) {
        return;
    }

    if (sendButton.disabled) {
        return;
    }

    // Display the user's message.
    addMessage(message, "user");

    // Clear the input.
    userInput.value = "";

    // Show loading indicator.
    showLoading();

    sendButton.disabled = true;

    try {
        const response = await fetch("/api/chat", {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                input: message,
                conversationId: conversationId,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.output || "Failed to send message."
            );
        }

        // Remove loading indicator.
        removeLoading();

        // Display the AI response.
        addMessage(
            data.output || "I couldn't generate a response.",
            "bot"
        );

    } catch (error) {
        console.error("Chat error:", error);

        removeLoading();

        addMessage(
            "Unable to get a response. Please try again.",
            "bot"
        );

    } finally {
        sendButton.disabled = false;
        userInput.focus();
    }
}




async function loadConversationHistory() {
    try {
        const response = await fetch(
            `/api/chat/${encodeURIComponent(conversationId)}`
        );

        if (!response.ok) {
            throw new Error(
                "Failed to load conversation history."
            );
        }

        const data = await response.json();

        // Clear existing chat messages before restoring history.
        chatContainer.innerHTML = "";

        // Restore messages in chronological order.
        for (const message of data.messages || []) {
            if (
                message.role === "user" ||
                message.role === "assistant"
            ) {
                addMessage(
                    message.content,
                    message.role === "user" ? "user" : "bot"
                );
            }
        }

        scrollToBottom();

    } catch (error) {
        console.error(
            "Conversation history error:",
            error
        );
    }
}



let historyLoaded = false;

const historyReady = loadConversationHistory()
    .finally(() => {
        historyLoaded = true;
    });




chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Wait for history restoration to finish.
    if (!historyLoaded) {
        await historyReady;
    }

    const message = userInput.value.trim();

    await sendMessage(message);
});




async function sendQuickMessage(message) {
    if (!historyLoaded) {
        await historyReady;
    }

    await sendMessage(message);
}




function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}


function escapeHTML(text) {
    const div = document.createElement("div");

    div.textContent = String(text ?? "");

    return div.innerHTML;
}


function formatResponse(text) {
    if (!text) {
        return "I couldn't find an answer.";
    }

    return escapeHTML(text)
        .replace(/\n/g, "<br>");
}

