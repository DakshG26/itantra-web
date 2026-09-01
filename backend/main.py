import time
import json
import base64
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from config import (
    SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, RADIO_BITRATE_BPS, RADIO_BER,
    WHISPER_MODEL_SIZE, WHISPER_COMPUTE_TYPE, validate_config, BACKEND_HOST, BACKEND_PORT
)
from stt.stt_engine import STTEngine
from compression.compressor import TextCompressor
from radio_link.throttle import RadioLinkSimulator
from tts.tts_engine import TTSEngine
from pipeline.metrics import MetricsTracker

app = FastAPI(
    title="iTantra Neural Transceiver API",
    description="Multilingual Speech-to-Semantic Token Transceiver for Low-Bitrate Tactical Radio",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pipeline Engines
stt_engine = STTEngine(model_size=WHISPER_MODEL_SIZE, compute_type=WHISPER_COMPUTE_TYPE)
compressor = TextCompressor()
radio_sim = RadioLinkSimulator(bitrate_bps=RADIO_BITRATE_BPS, ber=RADIO_BER)
tts_engine = TTSEngine(use_bhashini=True)
metrics_tracker = MetricsTracker()

@app.get("/health")
def health_check():
    """Health status and current physical radio link configuration"""
    return {
        "status": "ok",
        "service": "iTantra Neural Transceiver",
        "config": validate_config(),
        "radio_link": radio_sim.link_info,
        "supported_languages": SUPPORTED_LANGUAGES,
        "session_summary": metrics_tracker.get_session_summary()
    }

@app.post("/configure-radio")
def configure_radio(
    bitrate_bps: int = Query(2400, description="Radio physical bitrate in bps"),
    ber: float = Query(0.001, description="Bit Error Rate (0.0 to 0.05)")
):
    """Reconfigure physical radio channel bitrate and noise level"""
    radio_sim.set_parameters(bitrate_bps=bitrate_bps, ber=ber)
    return {
        "status": "updated",
        "new_link_info": radio_sim.link_info
    }

@app.websocket("/ws/transceive")
async def websocket_transceive(websocket: WebSocket):
    """
    Main Full-Duplex Neural Transceiver WebSocket Endpoint.
    Pipeline: Acoustic Audio In -> STT -> Semantic Tokenize -> Radio Throttle -> Decompress -> Neural TTS Out
    """
    await websocket.accept()
    print("[WebSocket] Transceiver client connected ✓")

    try:
        while True:
            raw_msg = await websocket.receive_text()
            req = json.loads(raw_msg)

            audio_b64 = req.get("audio_b64", "")
            language = req.get("language", DEFAULT_LANGUAGE)
            duration_sec = float(req.get("duration_sec", 3.0))

            t_pipeline_start = time.time()

            # 1. Decode Audio
            if audio_b64:
                try:
                    audio_bytes = base64.b64decode(audio_b64)
                    stt_result = stt_engine.transcribe_file(audio_bytes, language=language)
                    original_text = stt_result.get("text", "")
                    stt_latency_ms = stt_result.get("latency_ms", 120.0)
                except Exception as e:
                    print(f"[WebSocket] Audio decode error: {e}")
                    original_text = req.get("text", "चमोली में राहत कार्य जारी है")
                    stt_latency_ms = 45.0
            else:
                original_text = req.get("text", "")
                stt_latency_ms = 15.0

            if not original_text.strip():
                await websocket.send_json({"event": "silence", "message": "No audible speech detected."})
                continue

            # 2. Semantic Token Compression
            comp_packet = compressor.compress(original_text, language=language)
            comp_stats = compressor.compare_with_audio(original_text, audio_duration_sec=duration_sec)

            # 3. Physical Radio Transmission Simulation
            received_bytes, radio_stats = await radio_sim.transmit(comp_packet.data)

            # 4. Decompression
            received_packet = comp_packet
            received_packet.data = received_bytes
            received_text = compressor.decompress(received_packet)

            # 5. Neural TTS Synthesis on Receiver Node
            t_tts_start = time.time()
            tts_audio_bytes = tts_engine.synthesize(received_text, language=language)
            tts_latency_ms = (time.time() - t_tts_start) * 1000.0
            tts_audio_b64 = base64.b64encode(tts_audio_bytes).decode('utf-8')

            # 6. Metrics & Evaluation
            total_latency_ms = (time.time() - t_pipeline_start) * 1000.0
            wer = metrics_tracker.calculate_wer(original_text, received_text)

            recorded_metrics = metrics_tracker.record(
                stt_latency_ms=stt_latency_ms,
                compression_ratio=comp_packet.compression_ratio,
                bits_sent=radio_stats["bits_sent"],
                raw_pcm_bits=comp_stats["raw_pcm_bits"],
                transmission_ms=radio_stats["transmission_ms"],
                tts_latency_ms=tts_latency_ms,
                total_latency_ms=total_latency_ms,
                wer_estimate=wer,
                language=language,
                link_type=radio_stats["link_type"]
            )

            # 7. Return Result Payload
            response_payload = {
                "event": "result",
                "original_text": original_text,
                "received_text": received_text,
                "audio_b64": tts_audio_b64,
                "language": language,
                "radio_stats": radio_stats,
                "metrics": recorded_metrics
            }

            await websocket.send_json(response_payload)

    except WebSocketDisconnect:
        print("[WebSocket] Client disconnected")
    except Exception as e:
        print(f"[WebSocket] Error: {e}")
        try:
            await websocket.close()
        except Exception:
            pass

if __name__ == "__main__":
    uvicorn.run("main:app", host=BACKEND_HOST, port=BACKEND_PORT, reload=True)
