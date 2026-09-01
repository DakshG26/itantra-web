import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Bhashini API Credentials
BHASHINI_USER_ID = os.getenv("BHASHINI_USER_ID", "")
BHASHINI_API_KEY = os.getenv("BHASHINI_API_KEY", "")

# Server Configuration
BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", 8000))

# Supported Indic Languages
SUPPORTED_LANGUAGES = {
    "hi": "Hindi",
    "ta": "Tamil",
    "mr": "Marathi",
    "te": "Telugu",
    "bn": "Bengali",
    "en": "English"
}
DEFAULT_LANGUAGE = "hi"

# Radio Physical Layer Simulation Settings
RADIO_BITRATE_BPS = int(os.getenv("RADIO_BITRATE_BPS", 2400))  # 2400 bps default (LoRa/HF radio)
RADIO_BER = float(os.getenv("RADIO_BER", 0.001))              # Bit Error Rate 0.1%

# Faster Whisper STT Settings
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "tiny")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

# Audio Settings
SAMPLE_RATE = 16000
MAX_RECORD_SECONDS = 10

def validate_config():
    """Validate runtime environment and credentials"""
    has_bhashini = bool(BHASHINI_USER_ID and BHASHINI_API_KEY)
    return {
        "bhashini_configured": has_bhashini,
        "default_language": DEFAULT_LANGUAGE,
        "radio_bitrate_bps": RADIO_BITRATE_BPS,
        "radio_ber": RADIO_BER,
        "whisper_model": WHISPER_MODEL_SIZE,
        "whisper_compute": WHISPER_COMPUTE_TYPE
    }

if __name__ == "__main__":
    print("iTantra Config Validation:", validate_config())
