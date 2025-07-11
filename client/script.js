// WebSocket connection
let ws = null;
let reconnectInterval = null;

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = function() {
    console.log('WebSocket connected successfully');
    clearInterval(reconnectInterval);
  };
  
  ws.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        displayMessage(data.username, data.content);
      }
    } catch (e) {
      console.error('Error parsing WebSocket message:', e);
    }
  };
  
  ws.onclose = function() {
    console.log('WebSocket disconnected');
    // Attempt to reconnect every 3 seconds
    reconnectInterval = setInterval(connectWebSocket, 3000);
  };
  
  ws.onerror = function(error) {
    console.error('WebSocket error:', error);
  };
}

function sendMessage() {
  const input = document.getElementById("messageInput");
  const messages = document.getElementById("messages");

  const msgText = input.value.trim();
  if (!msgText) return;

  // Send via WebSocket if connected
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'send_message',
      content: msgText
    }));
  } else {
    // Fallback: display locally
    displayMessage('You', msgText);
  }

  input.value = "";
  input.focus();
}

function displayMessage(username, content) {
  const messages = document.getElementById("messages");
  
  const msg = document.createElement("div");
  msg.className = "message";
  msg.innerHTML = `<strong>${username}:</strong> ${content}`;

  messages.appendChild(msg);
  scrollToBottom();

  // Fade out after 10 seconds
  setTimeout(() => {
    msg.classList.add("fade-out");
    setTimeout(() => {
      if (msg.parentNode) {
        msg.remove();
      }
    }, 400);
  }, 10000);
}

function scrollToBottom() {
  const messages = document.getElementById("messages");
  messages.scrollTop = messages.scrollHeight;
}

// Auto-focus input on page load
document.addEventListener('DOMContentLoaded', function() {
  const input = document.getElementById("messageInput");
  input.focus();
  
  // Connect WebSocket
  connectWebSocket();
  
  // Handle enter key
  input.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });
});

// Load recent messages when page loads
fetch('/api/recent-messages')
  .then(response => response.json())
  .then(messages => {
    messages.forEach(msg => {
      displayMessage(msg.username, msg.content);
    });
  })
  .catch(error => {
    console.log('Could not load recent messages:', error);
  });