# P2P Chat Application via WebRTC

A **serverless chat application** built using **WebRTC** for peer-to-peer communication.\
This project demonstrates how two users can exchange text messages without relying on a central server, not even for signaling.\
Signaling is done manually.

> [!WARNING]
> DESIGNED PURELY FOR **LEARNING PURPOSES** ONLY.

---

## How It Works

1. User A creates an offer and shares it manually with User B.
2. User B pastes the offer and creates an answer, shares it manually with User A.
3. User A pastes the answer to complete the handshake.
4. Once connected, both users can chat directly.

## Overview

- **No Backend**: No server or database involved.
- **Manual Signaling**: Peers exchange connection details manually (via copy-paste).
- **Peer-to-Peer Chat**: Uses WebRTC's `RTCDataChannel` to send messages directly between users.
