const chatLog = document.getElementById("chat-log") as HTMLDivElement;
const messageInput = document.getElementById(
  "message-input",
) as HTMLInputElement;
const sendButton = document.getElementById("send-button") as HTMLButtonElement;

let socket: WebSocket;

function initWebSocket(): void {
  socket = new WebSocket("ws://localhost:8765");

  socket.onopen = () => {
    console.log("WebSocket connected.");
    if (chatLog) {
      chatLog.innerHTML += "<p><em>Connected to the server.</em></p>";
    }
  };

  socket.onmessage = (event) => {
    console.log("Received message:", event.data);
    if (chatLog) {
      chatLog.innerHTML += `<p>Server: ${event.data}</p>`;
    }
  };

  socket.onclose = () => {
    console.log("WebSocket disconnected.");
    if (chatLog) {
      chatLog.innerHTML += "<p><em>Disconnected from the server.</em></p>";
    }
  };
}

sendButton.addEventListener("click", () => {
  const message = messageInput.value.trim();
  if (message && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(message);
    chatLog.innerHTML += `<p>You: ${message}</p>`;
    messageInput.value = "";
  }
});

window.addEventListener("DOMContentLoaded", () => {
  initWebSocket();
});
