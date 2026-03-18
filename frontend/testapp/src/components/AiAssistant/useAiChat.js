import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_AI_URL || 'http://localhost:8000/chat';


export function useAiChat(patient, userRole) {
  const [messages, setMessages] = useState([]);   
  const [history,  setHistory]  = useState([]);   
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || isLoading) return null;

    setIsLoading(true);
    setError(null);

    const userMsg = { role: 'user', content: text.trim(), id: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:      text.trim(),
          patient_name: patient?.name         || 'Patient',
          patient_age:  patient?.age          || 70,
          stage:        patient?.current_stage ?? 0,
          user_role:    userRole              || 'caregiver',
          history:      history.slice(-20),   
        }),
      });

      if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`);

      const data  = await res.json();
      const reply = data.reply;

      const botMsg = { role: 'assistant', content: reply, id: Date.now() + 1 };
      setMessages(prev => [...prev, botMsg]);

      setHistory(prev => [
        ...prev,
        { role: 'user',      content: text.trim() },
        { role: 'assistant', content: reply        },
      ].slice(-20));

      setIsLoading(false);
      return reply; 

    } catch (err) {
      setError('Impossible de contacter le service IA. Vérifiez que le backend tourne sur le port 8000.');
      setIsLoading(false);
      return null;
    }
  }, [patient, userRole, history, isLoading]);

  const clearChat = () => {
    setMessages([]);
    setHistory([]);
    setError(null);
  };

  return { messages, isLoading, error, sendMessage, clearChat };
}