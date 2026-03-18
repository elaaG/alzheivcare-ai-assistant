import { useRef, useState } from 'react';

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utterRef = useRef(null);

  const speak = (text, { onStart, onEnd } = {}) => {
    if (!window.speechSynthesis) {
      onEnd?.();
      return;
    }

    const clean = text.replace(/⚠️/g, '').replace(/\*/g, '').trim();
    const utter = new SpeechSynthesisUtterance(clean);
    utterRef.current = utter;

    const voices   = speechSynthesis.getVoices();
    const frVoice  = voices.find(v => v.lang === 'fr-FR' && v.localService)
                  || voices.find(v => v.lang.startsWith('fr'))
                  || voices[0];

    if (frVoice) utter.voice = frVoice;

    utter.rate   = 0.88; 
    utter.pitch  = 1.0;
    utter.volume = 1.0;

    utter.onstart = () => { setIsSpeaking(true); onStart?.(); };
    utter.onend   = () => { setIsSpeaking(false); utterRef.current = null; onEnd?.(); };
    utter.onerror = () => { setIsSpeaking(false); utterRef.current = null; onEnd?.(); };

    speechSynthesis.cancel(); 
    speechSynthesis.speak(utter);
  };

  const stop = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
    utterRef.current = null;
  };

  const loadVoices = () => {
    speechSynthesis.getVoices();
  };

  return { isSpeaking, speak, stop, loadVoices };
}