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
  if (!messages) return;
  
  const msg = document.createElement("div");
  msg.className = "message";
  msg.innerHTML = `<strong>${username}:</strong> ${content}`;

  try {
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;

    // Fade out after 10 seconds
    setTimeout(() => {
      if (msg && msg.parentNode) {
        msg.classList.add("fade-out");
        setTimeout(() => {
          if (msg && msg.parentNode && msg.parentNode.contains(msg)) {
            msg.remove();
          }
        }, 400);
      }
    }, 10000);
  } catch (error) {
    console.error('Error displaying message:', error);
  }
}

// Auto-focus input on page load
document.addEventListener('DOMContentLoaded', function() {
  const input = document.getElementById("messageInput");
  if (input) {
    input.focus();
    
    // Handle enter key
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  
  // Connect WebSocket
  connectWebSocket();
});

// Load recent messages when page loads
fetch('/api/recent-messages')
  .then(response => response.json())
  .then(messages => {
    if (Array.isArray(messages)) {
      messages.forEach(msg => {
        if (msg && msg.username && msg.content) {
          displayMessage(msg.username, msg.content);
        }
      });
    }
  })
  .catch(error => {
    console.log('Could not load recent messages:', error);
  });