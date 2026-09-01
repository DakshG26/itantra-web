import time

class MetricsTracker:
    def __init__(self):
        self.history = []
        self.session_start = time.time()

    def record(
        self,
        stt_latency_ms: float,
        compression_ratio: float,
        bits_sent: int,
        raw_pcm_bits: int,
        transmission_ms: float,
        tts_latency_ms: float,
        total_latency_ms: float,
        wer_estimate: float = 0.0,
        language: str = "hi",
        link_type: str = "HF Radio"
    ) -> dict:
        """Records end-to-end metrics for a single transmission"""
        savings_vs_raw = round(raw_pcm_bits / bits_sent, 1) if bits_sent > 0 else 2666.0
        
        metric_entry = {
            "timestamp": time.time(),
            "language": language,
            "stt_latency_ms": round(stt_latency_ms, 1),
            "compression_ratio": round(compression_ratio, 2),
            "itantra_bits": bits_sent,
            "raw_pcm_bits": raw_pcm_bits,
            "opus_bits": int(raw_pcm_bits * (8000 / 256000)),
            "transmission_ms": round(transmission_ms, 1),
            "tts_latency_ms": round(tts_latency_ms, 1),
            "total_latency_ms": round(total_latency_ms, 1),
            "wer_estimate": round(wer_estimate, 3),
            "link_type": link_type,
            "savings_vs_raw": f"{savings_vs_raw:.0f}x smaller",
            "savings_vs_opus": f"{max(1.0, 8000 * 3 / max(1, bits_sent)):.0f}x smaller"
        }

        self.history.append(metric_entry)
        return metric_entry

    def get_session_summary(self) -> dict:
        """Calculates aggregate averages across all session transmissions"""
        if not self.history:
            return {
                "avg_total_latency_ms": 0,
                "avg_compression_ratio": 0,
                "total_bits_saved": 0,
                "total_transmissions": 0,
                "session_duration_sec": round(time.time() - self.session_start, 1)
            }

        total_tx = len(self.history)
        avg_lat = sum(m["total_latency_ms"] for m in self.history) / total_tx
        avg_ratio = sum(m["compression_ratio"] for m in self.history) / total_tx
        total_raw_saved = sum(m["raw_pcm_bits"] - m["itantra_bits"] for m in self.history)

        return {
            "avg_total_latency_ms": round(avg_lat, 1),
            "avg_compression_ratio": round(avg_ratio, 2),
            "total_bits_saved": total_raw_saved,
            "total_transmissions": total_tx,
            "session_duration_sec": round(time.time() - self.session_start, 1)
        }

    def get_latest(self) -> dict:
        """Returns the most recent transmission metric"""
        return self.history[-1] if self.history else {}

    def calculate_wer(self, original: str, received: str) -> float:
        """Calculates Word Error Rate (WER) using Levenshtein distance on words"""
        orig_words = original.strip().split()
        rec_words = received.strip().split()

        if not orig_words:
            return 0.0 if not rec_words else 1.0

        d = [[0] * (len(rec_words) + 1) for _ in range(len(orig_words) + 1)]

        for i in range(len(orig_words) + 1):
            d[i][0] = i
        for j in range(len(rec_words) + 1):
            d[0][j] = j

        for i in range(1, len(orig_words) + 1):
            for j in range(1, len(rec_words) + 1):
                if orig_words[i - 1] == rec_words[j - 1]:
                    d[i][j] = d[i - 1][j - 1]
                else:
                    d[i][j] = min(
                        d[i - 1][j] + 1,      # deletion
                        d[i][j - 1] + 1,      # insertion
                        d[i - 1][j - 1] + 1   # substitution
                    )

        wer = d[len(orig_words)][len(rec_words)] / len(orig_words)
        return min(1.0, wer)

if __name__ == "__main__":
    tracker = MetricsTracker()
    w = tracker.calculate_wer("चमोली में बादल फटा", "चमोली में बादल फटा है")
    print("Test WER:", w)
