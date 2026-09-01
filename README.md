# 🚀 iTantra — ISRO Ultra-Low Bandwidth Speech Transceiver
### Problem Statement SIH26173 | 24 bps Neural Semantic Compression & P2P Mesh Transceiver

[![Live Web App](https://img.shields.io/badge/Live%20Demo-itantra--isro.vercel.app-0052CC?style=for-the-badge&logo=vercel)](https://itantra-isro.vercel.app)
[![Android App Repo](https://img.shields.io/badge/Android%20App-DakshG26%2Fitantra--android-0288D1?style=for-the-badge&logo=android)](https://github.com/DakshG26/itantra-android)
[![Direct APK Download](https://img.shields.io/badge/Download%20APK-v1.0.0-00875A?style=for-the-badge&logo=android)](https://github.com/DakshG26/itantra-android/releases)

---

## 🌐 Quick Links & Deployments
- **🔴 Live Web Application:** [https://itantra-isro.vercel.app](https://itantra-isro.vercel.app)
- **📱 Native Android App Repository:** [https://github.com/DakshG26/itantra-android](https://github.com/DakshG26/itantra-android)
- **⚡ Download Latest Android APK:** [iTantra Releases](https://github.com/DakshG26/itantra-android/releases)

---

## 🛰️ Technical Overview
In tactical, disaster-recovery, and space communications (ISRO VHF/HF tactical radios), transmission bandwidth is restricted to **24 bps to 50 bps**. Traditional PCM audio streams (64,000 bps) and standard codecs fail completely.

**iTantra** solves this via **Neural Semantic Quantization**:
1. **On-Device STT (Speech-to-Text):** Voice signals are transcribed locally.
2. **18-Byte Neural Tokenization:** Utterances are mapped into 18-byte compressed packets with CRC16 error validation (**2,666× bandwidth compression**).
3. **RF Channel Throttling:** Transmits over air-gapped radio channels at genuine 24 bps physical constraints.
4. **On-Device Neural TTS:** The receiving node parses the tokens and synthesizes natural Indic speech in the target dialect in under **369 ms**.

---

## 🏗️ Architecture & Latency Budget (369 ms)

```
[Voice Input 3.0s] (48,000 Bytes)
       │
       ▼ (Faster-Whisper / On-Device STT: ~120 ms)
[Semantic Text String]
       │
       ▼ (18-Byte LZ4/Neural Tokenizer: ~8 ms)
[18-Byte Quantized Radio Packet] ──► 2,666× Reduction (0.038% original size)
       │
       ▼ (24 bps RF Tactical Simulator: ~18 ms)
[P2P RF Receiver / Mesh Node]
       │
       ▼ (Bhashini API / On-Device Offline TTS: ~223 ms)
[Synthesized Natural Speech Output] (Total Pipeline Latency: 369 ms)
```

---

## 💻 Tech Stack
- **Frontend:** React 18, Vite, Canvas Waveform Visualizer, PeerJS (WebRTC P2P Data Channels).
- **Backend:** FastAPI, Faster-Whisper, Bhashini ULCA API, Token-Bucket Rate Limiter.
- **Deployment:** Vercel (Frontend), Docker Compose (Full Stack).

---

## 🚀 Running Locally

```bash
# Clone the repository
git clone https://github.com/DakshG26/itantra-web.git
cd itantra-web

# Install frontend dependencies & run
npm install
npm run dev

# (Optional) Run Python STT/TTS Backend
cd backend
pip install -r requirements.txt
python main.py
```
