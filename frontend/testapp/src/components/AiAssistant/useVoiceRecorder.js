import { useState, useRef } from 'react';


export function useVoiceRecorder(onResult, onError) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  const isSupported = !!SpeechRecognition;

  const start = () => {
    if (!SpeechRecognition) {
      onError?.('Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang           = 'fr-FR'; 
    recognition.interimResults = true;
    recognition.continuous     = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (e) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
      if (final.trim()) {
        recognition.stop();
        onResult(final.trim());
      }
    };

    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error === 'no-speech')   onError?.('Aucune voix détectée. Réessayez.');
      if (e.error === 'not-allowed') onError?.('Microphone non autorisé. Vérifiez les permissions du navigateur.');
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return { isListening, start, stop, isSupported };
}