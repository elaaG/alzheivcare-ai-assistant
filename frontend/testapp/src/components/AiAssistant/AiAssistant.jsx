import { useState, useEffect, useRef } from 'react';
import styles from './AiAssistant.module.css';
import { useVoiceRecorder } from './useVoiceRecorder';
import { useSpeech }        from './useSpeech';
import { useAiChat }        from './useAiChat';



const STAGE_LABELS = { 0: 'Léger', 1: 'Modéré', 2: 'Sévère' };
const ROLE_LABELS  = { caregiver: 'Aidant', doctor: 'Médecin' };

const HINTS = [
  { label: 'Répétition des questions', text: 'Ma mère répète les mêmes questions. Est-ce normal ?' },
  { label: 'Médicaments',              text: 'Comment gérer les médicaments au quotidien ?' },
  { label: 'Stimulation cognitive',    text: 'Quels jeux sont bons pour stimuler la mémoire ?' },
  { label: 'Conseils aidant',          text: "Comment rester calme en tant qu'aidant ?" },
];

export default function AiAssistant({ patient, userRole = 'caregiver' }) {
  const [textValue,   setTextValue]   = useState('');
  const [isBusy,      setIsBusy]      = useState(false);
  const [transcript,  setTranscript]  = useState('');
  const [speakingId,  setSpeakingId]  = useState(null);

  const messagesEndRef = useRef(null);
  const textRef        = useRef(null);

  const { messages, isLoading, error, sendMessage, clearChat } = useAiChat(patient, userRole);

  const { isSpeaking, speak, stop: stopSpeech, loadVoices } = useSpeech();

  const { isListening, start: startMic, stop: stopMic, isSupported } = useVoiceRecorder(
    (finalText) => {
      setTranscript('');
      handleSend(finalText);
    },
    (errMsg) => console.warn(errMsg)
  );

  useEffect(() => { loadVoices(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (text) => {
    if (!text?.trim() || isBusy) return;
    setIsBusy(true);

    const reply = await sendMessage(text);

    if (reply) {
      const msgId = Date.now();
      setSpeakingId(msgId);
      speak(reply, {
        onEnd: () => { setIsBusy(false); setSpeakingId(null); }
      });
    } else {
      setIsBusy(false);
    }
  };

  const handleTextSend = () => {
    const text = textValue.trim();
    if (!text) return;
    setTextValue('');
    if (textRef.current) textRef.current.style.height = 'auto';
    handleSend(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSend(); }
  };

  const handleTextChange = (e) => {
    setTextValue(e.target.value);
    if (textRef.current) {
      textRef.current.style.height = 'auto';
      textRef.current.style.height = Math.min(textRef.current.scrollHeight, 80) + 'px';
    }
  };

  const handleOrbClick = () => {
    if (isBusy && isSpeaking) { stopSpeech(); setIsBusy(false); return; }
    if (isBusy) return;
    if (isListening) stopMic();
    else startMic();
  };

  const handleReplay = (text, id) => {
    stopSpeech();
    setSpeakingId(id);
    speak(text, { onEnd: () => setSpeakingId(null) });
  };

  const getStatus = () => {
    if (isListening) return { text: 'Je vous écoute…',         cls: styles.listening };
    if (isLoading)   return { text: 'Je réfléchis…',           cls: styles.thinking  };
    if (isSpeaking)  return { text: 'Je parle… (appuyez pour arrêter)', cls: styles.speaking  };
    return { text: isSupported ? 'Appuyez sur le micro pour parler' : 'Tapez votre question ci-dessous', cls: '' };
  };

  const status = getStatus();

  const orbClass = [
    styles.orb,
    isListening ? styles.listening : '',
    isLoading   ? styles.thinking  : '',
  ].join(' ');

  const stageClass = styles[`stage${patient?.current_stage ?? 0}`];

  return (
    <div className={styles.shell}>

      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.brandIcon}>
            {/* brain icon */}
            <svg viewBox="0 0 24 24">
              <path d="M13 3a4 4 0 0 1 4 4 4 4 0 0 1-1.08 2.71C17.24 10.65 18 12.22 18 14a6 6 0 0 1-6 6 6 6 0 0 1-6-6c0-1.78.76-3.35 1.97-4.45A4 4 0 0 1 7 7a4 4 0 0 1 4-4h2m-1 2h-1a2 2 0 0 0-2 2 2 2 0 0 0 .93 1.68l.53.34-.23.6A4 4 0 0 0 8 14a4 4 0 0 0 4 4 4 4 0 0 0 4-4c0-1.41-.73-2.67-1.93-3.38l-.56-.32.23-.61A2 2 0 0 0 15 8a2 2 0 0 0-2-2h-1z"/>
            </svg>
          </div>
          <div className={styles.brandText}>
            <h2>AlzheiCare Assistant</h2>
            <p>Assistant vocal intelligent — Alzheimer care support</p>
          </div>
          <div className={styles.liveBadge}>
            <div className={styles.liveDot}></div>
            En ligne
          </div>
        </div>

        {/* Patient info */}
        {patient && (
          <div className={styles.patientStrip}>
            <div className={styles.patientTag}>
              <span>Patient</span>
              <span>{patient.name}</span>
            </div>
            <div className={styles.patientTag}>
              <span>Âge</span>
              <span>{patient.age} ans</span>
            </div>
            <div className={`${styles.stageBadge} ${stageClass}`}>
              Stade {patient.current_stage} — {STAGE_LABELS[patient.current_stage]}
            </div>
            <div className={styles.roleBadge}>
              {ROLE_LABELS[userRole] || userRole}
            </div>
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div className={styles.messages}>

        {messages.length === 0 && !isLoading && (
          <div className={styles.emptyState}>
            <div className={styles.emptyOrb}>
              <svg viewBox="0 0 24 24">
                <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </div>
            <h3>Bonjour, je suis là pour vous aider</h3>
            <p>Appuyez sur le micro et parlez, ou tapez votre question.</p>
            <div className={styles.hintPills}>
              {HINTS.map(h => (
                <button key={h.label} className={styles.hintPill} onClick={() => handleSend(h.text)}>
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isBot      = msg.role === 'assistant';
          const isThisSpeaking = isSpeaking && speakingId === msg.id;
          return (
            <div key={msg.id || idx} className={`${styles.messageRow} ${isBot ? '' : styles.user}`}>
              <div className={`${styles.avatar} ${isBot ? styles.bot : styles.user}`}>
                {isBot ? 'IA' : 'Vous'}
              </div>
              <div className={`${styles.bubble} ${isBot ? styles.bot : styles.user} ${isThisSpeaking ? styles.speaking : ''}`}>
                {msg.content.split('\n').map((line, i) => (
                  <span key={i}>{line}{i < msg.content.split('\n').length - 1 && <br/>}</span>
                ))}
                {isBot && (
                  <button
                    className={`${styles.speakBtn} ${isThisSpeaking ? styles.active : ''}`}
                    onClick={() => handleReplay(msg.content, msg.id)}
                    title="Lire à voix haute"
                  >
                    🔊
                  </button>
                )}
                <span className={styles.bubbleTime}>
                  {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className={styles.messageRow}>
            <div className={`${styles.avatar} ${styles.bot}`}>IA</div>
            <div className={`${styles.bubble} ${styles.bot} ${styles.typingBubble}`}>
              <div className={styles.dots}>
                <span/><span/><span/>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef}/>
      </div>

      {/* Error */}
      {error && <div className={styles.errorBar}>{error}</div>}

      {/* ── Bottom controls ── */}
      <div className={styles.bottom}>

        <div className={`${styles.statusText} ${status.cls}`}>{status.text}</div>

        {/* Voice orb */}
        {isSupported && (
          <div className={styles.orbWrap}>
            <div className={`${styles.orbRing} ${isListening ? styles.active : ''}`}/>
            <button className={orbClass} onClick={handleOrbClick} aria-label="Parler">
              {/* mic icon */}
              <svg viewBox="0 0 24 24" style={{ display: isListening ? 'none' : 'block' }}>
                <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
              {/* wave bars (listening) */}
              <div className={`${styles.waveBars} ${isListening ? styles.show : ''}`}>
                <div className={styles.bar}/>
                <div className={styles.bar}/>
                <div className={styles.bar}/>
                <div className={styles.bar}/>
                <div className={styles.bar}/>
              </div>
            </button>
          </div>
        )}

        {transcript && <div className={styles.transcriptPreview}>{transcript}</div>}

        {/* Text input fallback */}
        <div className={styles.divider}>
          <div className={styles.dividerLine}/>
          <div className={styles.dividerText}>ou tapez</div>
          <div className={styles.dividerLine}/>
        </div>

        <div className={styles.textRow}>
          <textarea
            ref={textRef}
            className={styles.textInput}
            rows={1}
            placeholder="Écrivez votre question ici…"
            value={textValue}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={isBusy}
          />
          <button
            className={styles.sendBtn}
            onClick={handleTextSend}
            disabled={isBusy || !textValue.trim()}
            aria-label="Envoyer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}