let button_copy_to_clipboard = null;

let button_connect = null;
let button_disconnect = null;

let div_token_box = null;
let token_span = null;
let token_type = null;
let form_submit_token = null;
let token_inputBox = null;

let message_input = null;
let sendButton = null;
let message_text_area = null;

let peer = null;
let dataChannel;

const config = {
  iceServers: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

window.onload = () => {
  token_span = document.getElementById("token");
  div_token_box = document.getElementById("token-box");
  token_type = document.getElementById("token_type");
  token_inputBox = document.getElementById("inputBox");
  form_submit_token = document.getElementById("tokenInputForm");
  sendButton = document.getElementById("sendButton");
  message_text_area = document.getElementById("message_text_area");

  message_input = document.getElementById("message");
  message_input.addEventListener("focus", () => {
    message_input.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });

  button_connect = document.getElementById("connectButton");
  button_connect.addEventListener("click", async () => {
    message_text_area.innerHTML = "";
    token_inputBox.value = "";
    div_token_box.style.display = "flex";
    token_span.textContent = "generating token... (please wait)";
    token_inputBox.placeholder = "answer...";
    const rawtoken = await connectPeer();
    const temp = JSON.stringify(rawtoken);
    token_span.textContent = btoa(temp);
    button_copy_to_clipboard.disabled = false;
  });

  button_disconnect = document.getElementById("disconnectButton");
  button_disconnect.addEventListener("click", disconnectPeers, false);

  button_copy_to_clipboard = document.getElementById("copy_to_clipboard");
  button_copy_to_clipboard.addEventListener("click", copy_to_clipboard, false);
};

function copy_to_clipboard() {
  token_span = document.getElementById("token");
  if (token_span.textContent === "") {
    return;
  }
  navigator.clipboard
    .writeText(token_span.textContent)
    .then(() => console.log("copied!"))
    .catch((error) => alert("error coping: " + error));
}

function handleSubmit(event) {
  event.preventDefault();
  const inputValue = document.getElementById("inputBox").value;

  const data = JSON.parse(atob(inputValue));

  let token = {
    sdp: data.sdp,
    candidates: data.candidates,
  };

  if (token.sdp.type === "offer") {
    // accept the offer --> 'peer b'
    message_text_area.innerHTML = "";
    div_token_box.style.display = "flex";
    token_type.textContent = "answer token:";
    token_span.textContent = "generating token... (please wait)";
    acceptConnection(token.sdp)
      .then((rawtoken) => {
        const temp = JSON.stringify(rawtoken);
        token_span.textContent = btoa(temp);
        button_copy_to_clipboard.disabled = false;
        addIceCandidate(peer, token.candidates);
      })
      .catch((error) => {
        console.warn("error accepting offer: ", error);
      });
    console.log("offer accepted!");
  } else if (token.sdp.type === "answer") {
    // complete the connection --> 'peer a'
    acceptAnswer(token.sdp)
      .then(() => {
        addIceCandidate(peer, token.candidates);
        div_token_box.style.display = "none";
        form_submit_token.style.display = "none";
      })
      .catch((error) => {
        console.error("error accepting answers:", error);
      });

    console.log("connection established!");
  } else {
    console.error("sdp type error");
  }
}

//
// PEER A
//
async function connectPeer() {
  let token = {
    sdp: null,
    candidates: [],
  };

  peer = new RTCPeerConnection(config);
  dataChannel = peer.createDataChannel("dataChannel");
  setupDataChannelHandlers();

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  token.sdp = offer;

  peer.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      token.candidates.push(event.candidate);
    }
  });

  await new Promise((resolve) => {
    if (peer.iceGatheringState === "complete") {
      resolve();
    } else {
      peer.addEventListener("icegatheringstatechange", function checkState() {
        if (peer.iceGatheringState === "complete") {
          peer.removeEventListener("icegatheringstatechange", checkState);
          resolve();
        }
      });
    }
  });

  // Listen for connectionstatechange on the local RTCPeerConnection
  peer.addEventListener("connectionstatechange", (event) => {
    if (peer.connectionState === "connected") {
      div_token_box.style.display = "none";
      form_submit_token.style.display = "none";
      button_connect.disabled = true;
      button_disconnect.disabled = false;
      console.log("peer connection state: ", peer.connectionState);
    }
  });

  return token;
}

async function acceptAnswer(answer) {
  const remoteDesc = new RTCSessionDescription(answer);
  await peer.setRemoteDescription(remoteDesc);
}

//
//  PEER B
//
async function acceptConnection(offer) {
  let token = {
    sdp: null,
    candidates: [],
  };

  peer = new RTCPeerConnection(config);
  peer.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  token.sdp = answer;

  peer.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      token.candidates.push(event.candidate);
    }
  });

  await new Promise((resolve) => {
    if (peer.iceGatheringState === "complete") {
      resolve();
    } else {
      peer.addEventListener("icegatheringstatechange", function checkState() {
        if (peer.iceGatheringState === "complete") {
          peer.removeEventListener("icegatheringstatechange", checkState);
          resolve();
        }
      });
    }
  });

  // Listen for connectionstatechange on the local RTCPeerConnection
  peer.addEventListener("connectionstatechange", (event) => {
    if (peer.connectionState === "connected") {
      div_token_box.style.display = "none";
      form_submit_token.style.display = "none";
      button_connect.disabled = true;
      button_disconnect.disabled = false;
      console.log("peer connection state: ", peer.connectionState);
    }
  });

  peer.addEventListener("datachannel", (event) => {
    dataChannel = event.channel;
    setupDataChannelHandlers();
  });

  return token;
}

//
// Utils
//

function addIceCandidate(peer, iceCandidates) {
  iceCandidates.forEach((iceCandidate) => {
    try {
      peer.addIceCandidate(iceCandidate);
    } catch (e) {
      console.error("Error adding received ice candidate", e);
    }
  });
}

function disconnectPeers() {
  // Close the RTCDataChannels
  dataChannel.close();

  // Close the RTCPeerConnections
  peer.close();
  
  dataChannel = null;
  peer = null;

  // Update user interface elements
  form_submit_token.style.display = "block";
  div_token_box.style.display = "none";
  connectButton.disabled = false;
  disconnectButton.disabled = true;
  sendButton.disabled = true;
  message_input.value = "";
  token_inputBox.value = "";
}

//
//    DATA CHANNEL
//

function setupDataChannelHandlers() {
  // Enable textarea and button
  dataChannel.addEventListener("open", (event) => {
    message_input.disabled = false;
    message_input.focus();
    sendButton.disabled = false;
  });

  // Disable input
  dataChannel.addEventListener("close", (event) => {
    message_input.disabled = false;
    sendButton.disabled = true;
    disconnectPeers();
  });

  // Send and Receive data
  sendButton.addEventListener("click", (event) => {
    const message = message_input.value;
    if (!message) return;

    dataChannel.send(message);
    appendMessage("You", message);
    message_input.value = "";
  });

  dataChannel.addEventListener("message", (event) => {
    const message = event.data;
    appendMessage("Peer", message);
  });

  message_input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendButton.click();
    }
  });
}

function appendMessage(sender, message) {
  const wrapper = document.createElement("div");
  wrapper.className = "message-line";
  const timestamp = getCurrentTime();

  wrapper.innerHTML = `
    <span class="sender-label">${sender}:</span>
    <div class="message-bubble">
      <span class="message-text">${escapeHtml(message)}</span>
      <span class="timestamp">[${timestamp}]</span>
    </div>
  `;

  message_text_area.appendChild(wrapper);
  message_text_area.scrollTop = message_text_area.scrollHeight; // auto-scroll
}

function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function escapeHtml(str) {
  return str.replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m])
  );
}
