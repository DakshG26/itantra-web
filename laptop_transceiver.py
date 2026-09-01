#!/usr/bin/env python3
"""
iTantra — Real-Time Laptop <-> Phone Radio Bridge (ISRO SIH26173)
Communicates bidirectionally with the iTantra Android app over local socket/ADB.
"""

import sys
import os
import socket
import json
import time
import threading
import subprocess

PORT = 8888
DEFAULT_HOST = "127.0.0.1"

def setup_adb_forward():
    """Automatically forwards port 8888 if device is connected via USB/ADB"""
    adb_paths = [
        "adb",
        os.path.expanduser("~/Library/Android/sdk/platform-tools/adb")
    ]
    for adb in adb_paths:
        try:
            res = subprocess.run([adb, "forward", f"tcp:{PORT}", f"tcp:{PORT}"], capture_output=True, text=True)
            if res.returncode == 0:
                print("✓ ADB Port Forwarding active on port 8888")
                return True
        except Exception:
            pass
    return False

def listen_for_phone_packets(sock):
    """Background listener for incoming packets from phone"""
    f = sock.makefile('r')
    while True:
        try:
            line = f.readline()
            if not line:
                print("\n[Radio Link] Phone disconnected.")
                break
            packet = json.loads(line.strip())
            sender = packet.get("senderId", "PHONE-NODE")
            text = packet.get("text", "")
            lang = packet.get("language", "hi")
            is_sos = packet.get("isSos", False)
            hex_tokens = packet.get("tokensHex", "")

            print(f"\n📡 [INCOMING RADIO PACKET FROM {sender}]")
            if is_sos:
                print(f"🚨 SOS ALERT: {text}")
            else:
                print(f"💬 Message: \"{text}\" ({lang.upper()})")
            print(f"📦 18-Byte Token: {hex_tokens}")
            print("👉 Enter message to transmit to phone (or 'sos'): ", end="", flush=True)

            # Native Mac TTS Playback
            if sys.platform == "darwin":
                try:
                    subprocess.Popen(["say", text])
                except Exception:
                    pass

        except Exception as e:
            break

def main():
    print("=" * 60)
    print("🚀 iTantra — Laptop <-> Phone Live Transceiver Bridge")
    print("=" * 60)

    setup_adb_forward()

    target_host = DEFAULT_HOST
    if len(sys.argv) > 1:
        target_host = sys.argv[1]

    print(f"Connecting to iTantra Radio Node at {target_host}:{PORT}...")
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.connect((target_host, PORT))
        print("✅ CONNECTED to Phone! Real-time bidirectional radio link established.\n")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("\nMake sure:")
        print("1. iTantra app is open on your phone.")
        print("2. Phone is connected via USB with USB debugging enabled, OR specify phone Wi-Fi IP:")
        print("   python3 laptop_transceiver.py 192.168.1.x\n")
        return

    # Start background listener thread
    t = threading.Thread(target=listen_for_phone_packets, args=(sock,), daemon=True)
    t.start()

    print("Options:")
    print(" - Type any message (Hindi or English) and press Enter to transmit.")
    print(" - Type 'sos' for Level 0 Emergency SOS broadcast.")
    print(" - Type 'exit' to quit.\n")

    try:
        while True:
            text = input("👉 Enter message to transmit to phone: ").strip()
            if not text:
                continue
            if text.lower() == "exit":
                break

            is_sos = text.lower() == "sos"
            if is_sos:
                text = "🚨 EMERGENCY SOS: Level 0 Alert from Laptop Command [GPS: 30.42°N, 79.33°E]"

            packet = {
                "id": f"laptop-{int(time.time())}",
                "text": text,
                "language": "hi" if any(ord(c) > 127 for c in text) else "en",
                "isSos": is_sos,
                "senderId": "LAPTOP-COMMAND",
                "tokensHex": "5401008A3F1B4C829D31FA0788932CE14F92",
                "timestamp": int(time.time() * 1000),
                "isSentByMe": False
            }

            payload = (json.dumps(packet) + "\n").encode('utf-8')
            sock.sendall(payload)
            print(f"⚡ Transmitted 18-Byte token packet to phone -> \"{text}\"")

    except KeyboardInterrupt:
        pass
    finally:
        sock.close()
        print("\nDisconnected.")

if __name__ == "__main__":
    main()
