const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatContainer = document.getElementById("chatContainer");
const sendButton = document.getElementById("sendButton");




function addMessage(message, type) {

    const messageDiv = document.createElement("div");

    messageDiv.classList.add("message", type);

    const avatar = document.createElement("div");

    avatar.classList.add("avatar");

    avatar.textContent = type === "user" ? "👤" : "🤖";


    const content = document.createElement("div");

    content.classList.add("message-content");

    content.innerHTML = message;


    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    chatContainer.appendChild(messageDiv);

    scrollToBottom();
}




function showLoading() {

    const loading = document.createElement("div");

    loading.classList.add("message", "bot");

    loading.id = "loadingMessage";

    loading.innerHTML = `
        <div class="avatar">🤖</div>

        <div class="message-content">
            <span class="typing">
                Food AI is thinking...
            </span>
        </div>
    `;

    chatContainer.appendChild(loading);

    scrollToBottom();
}


function removeLoading() {

    const loading =
        document.getElementById("loadingMessage");

    if (loading) {
        loading.remove();
    }
}




async function sendMessage(message) {

    if (!message.trim()) {
        return;
    }


    // Show user's message
    addMessage(
        escapeHTML(message),
        "user"
    );


    // Clear input
    userInput.value = "";


    // Loading
    showLoading();

    sendButton.disabled = true;


    try {

        const response = await fetch("/api/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                input: message
            })

        });


        const data = await response.json();


        removeLoading();


        if (!response.ok) {

            addMessage(
                "Sorry, something went wrong. 😕",
                "bot"
            );

            return;
        }


        // Show AI response
        addMessage(
            formatResponse(data.output),
            "bot"
        );


    } catch (error) {

        console.error(error);

        removeLoading();

        addMessage(
            "Unable to connect to the server. 😕",
            "bot"
        );

    } finally {

        sendButton.disabled = false;

        userInput.focus();

    }
}




chatForm.addEventListener("submit", (event) => {

    event.preventDefault();

    const message = userInput.value.trim();

    sendMessage(message);

});




function sendQuickMessage(message) {

    sendMessage(message);

}




function scrollToBottom() {

    chatContainer.scrollTop =
        chatContainer.scrollHeight;

}




function escapeHTML(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}



function formatResponse(text) {

    if (!text) {
        return "I couldn't find an answer.";
    }

    return escapeHTML(text)
        .replace(/\n/g, "<br>");
}