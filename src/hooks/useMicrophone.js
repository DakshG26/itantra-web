import { useState, useRef, useCallback } from 'react';

export function useMicrophone() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const isSupported = typeof window !== 'undefined' && !!(navigator?.mediaDevices?.getUserMedia && window.MediaRecorder);

  const startRecording = useCallback((durationMs = 4000) => {
    return new Promise(async (resolve, reject) => {
      setError(null);
      audioChunksRef.current = [];

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          }
        });

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          setIsRecording(false);
          stream.getTracks().forEach((track) => track.stop());

          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const reader = new FileReader();

          reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            resolve({
              audioBase64: base64String,
              durationSec: durationMs / 1000,
              blob: audioBlob
            });
          };

          reader.onerror = (err) => {
            setError('Failed to read audio buffer');
            reject(err);
          };

          reader.readAsDataURL(audioBlob);
        };

        recorder.start(100);
        setIsRecording(true);

        setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }, durationMs);

      } catch (err) {
        setIsRecording(false);
        setError(err.message || 'Microphone access denied');
        reject(err);
      }
    });
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
    isSupported
  };
}
