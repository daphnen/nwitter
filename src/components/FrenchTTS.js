import { useState, useEffect, useRef, useCallback } from 'react';
import './FrenchTTS.css';

const SAMPLE_TEXTS = [
  'Bonjour, comment allez-vous aujourd\'hui ?',
  'La vie est belle et pleine de surprises.',
  'Je voudrais apprendre le français couramment.',
  'Paris est la ville de l\'amour et de la lumière.',
];

export default function FrenchTTS() {
  const [text, setText] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const utteranceRef = useRef(null);

  const loadVoices = useCallback(() => {
    const allVoices = window.speechSynthesis.getVoices();
    const frenchVoices = allVoices.filter((v) => v.lang.startsWith('fr'));
    setVoices(frenchVoices);
    if (frenchVoices.length > 0 && !selectedVoice) {
      setSelectedVoice(frenchVoices[0].name);
    }
  }, [selectedVoice]);

  useEffect(() => {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [loadVoices]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    setCharCount(e.target.value.length);
  };

  const speak = () => {
    if (!text.trim()) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = voices.find((v) => v.name === selectedVoice);
    if (voice) utterance.voice = voice;
    utterance.lang = 'fr-FR';
    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => { setIsSpeaking(true); setIsPaused(false); };
    utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); };
    utterance.onerror = () => { setIsSpeaking(false); setIsPaused(false); };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const togglePause = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const useSample = (sample) => {
    setText(sample);
    setCharCount(sample.length);
  };

  return (
    <div className="tts-container">
      <div className="tts-card">
        <div className="tts-header">
          <span className="tts-flag">🇫🇷</span>
          <h1 className="tts-title">Synthèse vocale française</h1>
          <p className="tts-subtitle">French Text-to-Speech</p>
        </div>

        <div className="tts-samples">
          <p className="tts-samples-label">Exemples :</p>
          <div className="tts-samples-list">
            {SAMPLE_TEXTS.map((s, i) => (
              <button key={i} className="tts-sample-btn" onClick={() => useSample(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="tts-textarea-wrapper">
          <textarea
            className="tts-textarea"
            value={text}
            onChange={handleTextChange}
            placeholder="Entrez votre texte en français ici..."
            rows={5}
            maxLength={500}
          />
          <span className="tts-char-count">{charCount} / 500</span>
        </div>

        <div className="tts-settings">
          <div className="tts-setting-group">
            <label className="tts-label">
              Voix {voices.length === 0 && <span className="tts-no-voice">(aucune voix française disponible)</span>}
            </label>
            <select
              className="tts-select"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              disabled={voices.length === 0}
            >
              {voices.length === 0 && <option>Voix système par défaut</option>}
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          <div className="tts-setting-group">
            <label className="tts-label">
              Vitesse <span className="tts-value">{rate.toFixed(1)}x</span>
            </label>
            <input
              type="range"
              className="tts-range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
            />
            <div className="tts-range-labels">
              <span>Lent</span><span>Normal</span><span>Rapide</span>
            </div>
          </div>

          <div className="tts-setting-group">
            <label className="tts-label">
              Tonalité <span className="tts-value">{pitch.toFixed(1)}</span>
            </label>
            <input
              type="range"
              className="tts-range"
              min="0.5"
              max="2"
              step="0.1"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
            />
            <div className="tts-range-labels">
              <span>Grave</span><span>Normal</span><span>Aigu</span>
            </div>
          </div>
        </div>

        <div className="tts-controls">
          {!isSpeaking ? (
            <button
              className="tts-btn tts-btn-speak"
              onClick={speak}
              disabled={!text.trim()}
            >
              ▶ Parler
            </button>
          ) : (
            <>
              <button className="tts-btn tts-btn-pause" onClick={togglePause}>
                {isPaused ? '▶ Reprendre' : '⏸ Pause'}
              </button>
              <button className="tts-btn tts-btn-stop" onClick={stop}>
                ■ Arrêter
              </button>
            </>
          )}
        </div>

        {isSpeaking && (
          <div className="tts-status">
            <span className={`tts-dot ${isPaused ? 'tts-dot-paused' : 'tts-dot-speaking'}`} />
            {isPaused ? 'En pause' : 'En cours de lecture...'}
          </div>
        )}
      </div>
    </div>
  );
}
