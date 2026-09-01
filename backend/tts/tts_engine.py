import os
import io
import base64
import requests
import tempfile

try:
    import pyttsx3
    HAS_PYTTSX3 = True
except ImportError:
    HAS_PYTTSX3 = False

class TTSEngine:
    def __init__(self, use_bhashini: bool = True):
        self.use_bhashini = use_bhashini
        self.user_id = os.getenv("BHASHINI_USER_ID", "")
        self.api_key = os.getenv("BHASHINI_API_KEY", "")

    def synthesize(self, text: str, language: str = "hi") -> bytes:
        """
        Synthesizes speech in Indian languages.
        First tries Bhashini API, falls back to offline voice synthesizer.
        """
        if self.use_bhashini and self.user_id and self.api_key:
            try:
                audio_bytes = self._synthesize_bhashini(text, language)
                if audio_bytes and len(audio_bytes) > 100:
                    return audio_bytes
            except Exception as e:
                print(f"[TTSEngine] Bhashini API error: {e}. Falling back to local TTS engine.")

        return self._synthesize_fallback(text, language)

    def _synthesize_bhashini(self, text: str, language: str) -> bytes:
        """
        Calls Government Bhashini ULCA API pipeline for Indian Language TTS
        """
        headers = {
            "userID": self.user_id,
            "ulcaApiKey": self.api_key,
            "Content-Type": "application/json"
        }

        # Step 1: Query Pipeline Config
        pipeline_url = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
        pipeline_payload = {
            "pipelineTasks": [
                {
                    "taskType": "tts",
                    "config": {
                        "language": {
                            "sourceLanguage": language
                        }
                    }
                }
            ],
            "pipelineRequestConfig": {
                "pipelineId": "64392f96daac500b55c543cd"
            }
        }

        resp = requests.post(pipeline_url, json=pipeline_payload, headers=headers, timeout=5)
        if resp.status_code != 200:
            raise RuntimeError(f"Bhashini pipeline error {resp.status_code}: {resp.text}")

        res_data = resp.json()
        callback_url = res_data["pipelineInferenceAPIEndPoint"]["callbackUrl"]
        inference_auth_key = res_data["pipelineInferenceAPIEndPoint"]["inferenceApiKey"]["value"]
        service_id = res_data["pipelineResponseConfig"][0]["config"][0]["serviceId"]

        # Step 2: Compute Inference
        infer_headers = {
            "Authorization": inference_auth_key,
            "Content-Type": "application/json"
        }
        infer_payload = {
            "pipelineTasks": [
                {
                    "taskType": "tts",
                    "config": {
                        "language": {
                            "sourceLanguage": language
                        },
                        "serviceId": service_id,
                        "gender": "male",
                        "samplingRate": 16000
                    }
                }
            ],
            "inputData": {
                "input": [
                    {
                        "source": text
                    }
                ]
            }
        }

        infer_resp = requests.post(callback_url, json=infer_payload, headers=infer_headers, timeout=8)
        if infer_resp.status_code != 200:
            raise RuntimeError(f"Bhashini inference error {infer_resp.status_code}")

        infer_json = infer_resp.json()
        audio_b64 = infer_json["pipelineResponse"][0]["audio"][0]["audioContent"]
        return base64.b64decode(audio_b64)

    def _synthesize_fallback(self, text: str, language: str) -> bytes:
        """
        Local offline synthesizer fallback (pyttsx3 or generated WAV tone)
        """
        if HAS_PYTTSX3:
            try:
                engine = pyttsx3.init()
                engine.setProperty('rate', 150)
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                    temp_path = f.name

                engine.save_to_file(text, temp_path)
                engine.runAndWait()

                with open(temp_path, "rb") as f:
                    wav_data = f.read()

                os.remove(temp_path)
                return wav_data
            except Exception as e:
                print(f"[TTSEngine] pyttsx3 failed: {e}")

        # Basic WAV header fallback with silent tone
        return self._generate_dummy_wav()

    def _generate_dummy_wav(self) -> bytes:
        """Generates a minimal 1-second 16kHz PCM WAV header"""
        import struct
        sample_rate = 16000
        num_samples = 16000
        byte_rate = sample_rate * 2
        block_align = 2
        data_size = num_samples * 2

        header = struct.pack(
            '<4sI4s4sIHHIIHH4sI',
            b'RIFF',
            36 + data_size,
            b'WAVE',
            b'fmt ',
            16,
            1,  # PCM
            1,  # mono
            sample_rate,
            byte_rate,
            block_align,
            16,  # bits per sample
            b'data',
            data_size
        )
        samples = bytearray(data_size)
        return header + bytes(samples)

if __name__ == "__main__":
    tts = TTSEngine(use_bhashini=False)
    wav = tts.synthesize("चमोली में राहत कार्य जारी है", language="hi")
    print(f"Generated {len(wav)} WAV bytes")
