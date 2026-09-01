import asyncio
import time
import random

class RadioLinkSimulator:
    def __init__(self, bitrate_bps: int = 2400, ber: float = 0.001):
        self.bitrate_bps = bitrate_bps
        self.ber = ber
        self.bytes_per_sec = max(1.0, bitrate_bps / 8.0)
        self.tokens = self.bytes_per_sec
        self.last_refill = time.monotonic()

    def set_parameters(self, bitrate_bps: int, ber: float):
        """Update radio link parameters at runtime"""
        self.bitrate_bps = bitrate_bps
        self.ber = ber
        self.bytes_per_sec = max(1.0, bitrate_bps / 8.0)
        self.tokens = self.bytes_per_sec
        self.last_refill = time.monotonic()

    def _refill_tokens(self):
        """Refill token bucket according to elapsed time"""
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.bytes_per_sec, self.tokens + elapsed * self.bytes_per_sec)
        self.last_refill = now

    def _apply_bit_errors(self, data: bytes) -> tuple[bytes, int]:
        """Flips bits randomly based on Bit Error Rate (BER)"""
        if self.ber <= 0:
            return data, 0

        byte_arr = bytearray(data)
        flipped_bits_count = 0

        for byte_idx in range(len(byte_arr)):
            for bit_pos in range(8):
                if random.random() < self.ber:
                    byte_arr[byte_idx] ^= (1 << bit_pos)
                    flipped_bits_count += 1

        return bytes(byte_arr), flipped_bits_count

    def _classify_link(self) -> str:
        """Classify physical radio type by bitrate"""
        if self.bitrate_bps <= 1200:
            return "HF Tactical Radio (Extreme Low)"
        elif self.bitrate_bps <= 4800:
            return "Satellite Low-Bitrate Modem (Low)"
        elif self.bitrate_bps <= 9600:
            return "VHF / LoRa SX1262 (Medium)"
        else:
            return "Custom Tactical RF Link"

    async def transmit(self, data: bytes) -> tuple[bytes, dict]:
        """
        Simulates physical radio transmission time-on-air and RF channel noise.
        """
        data_len = len(data)
        bits_count = data_len * 8
        transmission_time_sec = bits_count / float(self.bitrate_bps)
        transmission_time_ms = round(transmission_time_sec * 1000.0, 1)

        # Rate-limiting / token bucket throttle
        self._refill_tokens()
        if data_len > self.tokens:
            wait_time = (data_len - self.tokens) / self.bytes_per_sec
            await asyncio.sleep(min(wait_time, 2.0))
            self.tokens = 0.0
        else:
            self.tokens -= data_len

        # Small physical delay simulation
        await asyncio.sleep(min(transmission_time_sec, 0.5))

        # Apply RF bit error noise
        corrupted_data, flipped_bits = self._apply_bit_errors(data)

        stats = {
            "bits_sent": bits_count,
            "bytes_sent": data_len,
            "transmission_ms": transmission_time_ms,
            "bitrate_bps": self.bitrate_bps,
            "ber": self.ber,
            "flipped_bits": flipped_bits,
            "link_type": self._classify_link(),
            "fec_status": "RS(32,24) Parity OK" if flipped_bits <= 4 else "Degraded RF Signal"
        }

        return corrupted_data, stats

    @property
    def link_info(self) -> dict:
        return {
            "bitrate_bps": self.bitrate_bps,
            "ber": self.ber,
            "link_type": self._classify_link()
        }

if __name__ == "__main__":
    async def test():
        sim = RadioLinkSimulator(bitrate_bps=2400, ber=0.005)
        raw = b"Hello ISRO iTantra Tactical Link"
        corrupted, stats = await sim.transmit(raw)
        print("Transmission Stats:", stats)
        print("Received Data:", corrupted)
    asyncio.run(test())
