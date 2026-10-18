const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatContainer = document.getElementById("chatContainer");
const sendButton = document.getElementById("sendButton");

const CONVERSATION_KEY = "restaurantConversationId";

function getConversationId() {
    let id = localStorage.getItem(CONVERSATION_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(CONVERSATION_KEY, id);
    }
    return id;
}

const conversationId = getConversationId();


function getTime() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}


function addMessage(message, type) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", type);

    const avatar = document.createElement("div");
    avatar.classList.add("avatar");
    if (type === "user") {
        avatar.textContent = "👤";
    } else {
        avatar.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3C9.5 3 7.5 4.5 7 6.5C5.8 6.8 5 7.8 5 9C5 10.5 6.2 11.7 7.7 11.7H16.3C17.8 11.7 19 10.5 19 9C19 7.8 18.2 6.8 17 6.5C16.5 4.5 14.5 3 12 3Z" fill="#3fb950"/><rect x="8" y="12" width="8" height="1.5" rx="0.75" fill="#3fb950"/><rect x="9" y="14.5" width="6" height="5" rx="1.5" fill="#3fb950"/><line x1="11" y1="14.5" x2="11" y2="19.5" stroke="#1a3a2a" stroke-width="1"/><line x1="13" y1="14.5" x2="13" y2="19.5" stroke="#1a3a2a" stroke-width="1"/></svg>`;
    }

    const bubbleWrap = document.createElement("div");
    bubbleWrap.classList.add("bubble-wrap");

    const content = document.createElement("div");
    content.classList.add("message-content");
    content.innerHTML = type === "user" ? escapeHTML(message) : formatResponse(message);

    const time = document.createElement("div");
    time.classList.add("message-time");
    time.textContent = getTime();

    bubbleWrap.appendChild(content);
    bubbleWrap.appendChild(time);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubbleWrap);

    chatContainer.appendChild(messageDiv);
    scrollToBottom();
}


function showLoading() {
    const loading = document.createElement("div");
    loading.classList.add("message", "bot");
    loading.id = "loadingMessage";

    const avatar = document.createElement("div");
    avatar.classList.add("avatar");
    avatar.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3C9.5 3 7.5 4.5 7 6.5C5.8 6.8 5 7.8 5 9C5 10.5 6.2 11.7 7.7 11.7H16.3C17.8 11.7 19 10.5 19 9C19 7.8 18.2 6.8 17 6.5C16.5 4.5 14.5 3 12 3Z" fill="#3fb950"/><rect x="8" y="12" width="8" height="1.5" rx="0.75" fill="#3fb950"/><rect x="9" y="14.5" width="6" height="5" rx="1.5" fill="#3fb950"/><line x1="11" y1="14.5" x2="11" y2="19.5" stroke="#1a3a2a" stroke-width="1"/><line x1="13" y1="14.5" x2="13" y2="19.5" stroke="#1a3a2a" stroke-width="1"/></svg>`;

    const bubbleWrap = document.createElement("div");
    bubbleWrap.classList.add("bubble-wrap");

    const content = document.createElement("div");
    content.classList.add("message-content");

    const dots = document.createElement("div");
    dots.classList.add("typing-dots");
    dots.innerHTML = "<span></span><span></span><span></span>";

    content.appendChild(dots);
    bubbleWrap.appendChild(content);
    loading.appendChild(avatar);
    loading.appendChild(bubbleWrap);

    chatContainer.appendChild(loading);
    scrollToBottom();
}


function removeLoading() {
    const loading = document.getElementById("loadingMessage");
    if (loading) loading.remove();
}


async function sendMessage(message) {
    if (!message.trim() || sendButton.disabled) return;

    addMessage(message, "user");
    userInput.value = "";
    showLoading();
    sendButton.disabled = true;

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input: message, conversationId }),
        });

        const data = await response.json();
        removeLoading();

        if (!response.ok) throw new Error(data.output || "Request failed.");

        addMessage(data.output || "I couldn't generate a response.", "bot");

    } catch (error) {
        console.error("Chat error:", error);
        removeLoading();
        addMessage("Unable to connect to the server. Please try again.", "bot");

    } finally {
        sendButton.disabled = false;
        userInput.focus();
    }
}


async function loadConversationHistory() {
    try {
        const response = await fetch(`/api/chat/${encodeURIComponent(conversationId)}`);
        if (!response.ok) return;

        const data = await response.json();
        chatContainer.innerHTML = "";

        for (const msg of data.messages || []) {
            if (msg.role === "user" || msg.role === "assistant") {
                addMessage(msg.content, msg.role === "user" ? "user" : "bot");
            }
        }

        scrollToBottom();
    } catch (error) {
        console.error("History error:", error);
    }
}


let historyLoaded = false;
const historyReady = loadConversationHistory().finally(() => { historyLoaded = true; });


chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!historyLoaded) await historyReady;
    await sendMessage(userInput.value.trim());
});


async function sendQuickMessage(message) {
    if (!historyLoaded) await historyReady;
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
    if (!text) return "I couldn't find an answer.";
    return escapeHTML(text)
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/^\* /gm, "• ")
        .replace(/\n/g, "<br>");
}
