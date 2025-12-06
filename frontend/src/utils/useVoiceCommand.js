import { useEffect, useRef, useState } from "react";

export const useVoiceCommand = (isActive) => {
  const [voiceGripping, setVoiceGripping] = useState(false);
  const [listeningStatus, setListeningStatus] = useState("OFF");
  const [lastHeard, setLastHeard] = useState("");

  // Gunakan Ref untuk melacak status aktif tanpa memicu render ulang
  const recognitionRef = useRef(null);
  const shouldBeOn = useRef(false); // Flag untuk kontrol restart manual

  useEffect(() => {
    // Jika mode manual dimatikan, stop semuanya
    if (!isActive) {
      setListeningStatus("OFF");
      shouldBeOn.current = false;
      if (recognitionRef.current) recognitionRef.current.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Browser tidak support Speech Recognition");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    shouldBeOn.current = true; // Tandai bahwa kita ingin mic menyala

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setListeningStatus("LISTENING...");
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.trim().toLowerCase();
        setLastHeard(transcript);

        if (
          transcript.includes("grab") ||
          transcript.includes("close") ||
          transcript.includes("lock") ||
          transcript.includes("up")
        ) {
          setVoiceGripping(true);
        }
        else if (
          transcript.includes("release") ||
          transcript.includes("open") ||
          transcript.includes("drop")
        ) {
          setVoiceGripping(false);
        }
      }
    };

    recognition.onerror = (event) => {
      // Error 'aborted' atau 'no-speech' sering terjadi, abaikan saja
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      console.warn("Mic Error:", event.error);
    };

    recognition.onend = () => {
      // LOGIKA SELF-HEALING:
      // Jika harusnya masih aktif (shouldBeOn), nyalakan lagi setelah jeda singkat
      if (shouldBeOn.current) {
        setListeningStatus("RESTARTING...");
        setTimeout(() => {
          if (shouldBeOn.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              // Ignore error if already started
            }
          }
        }, 300); // Jeda 300ms mencegah error "aborted" loop
      } else {
        setListeningStatus("OFF");
      }
    };

    // Start pertama kali
    try {
      recognition.start();
    } catch (e) { console.error(e); }

    // Cleanup saat komponen di-unmount atau mode berubah
    return () => {
      shouldBeOn.current = false; // Matikan flag restart
      if (recognitionRef.current) {
        recognitionRef.current.abort(); // Matikan paksa
      }
    };
  }, [isActive]);

  return { voiceGripping, listeningStatus, lastHeard };
};