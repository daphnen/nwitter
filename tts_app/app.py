import subprocess
import tempfile
import gradio as gr

_ALL_VOICES = [
    ("mb-fr1",    "♂  FR-1 · Homme naturel (MBROLA)",    "M"),
    ("mb-fr2",    "♀  FR-2 · Femme naturelle (MBROLA)",  "F"),
    ("mb-fr3",    "♂  FR-3 · Homme profond (MBROLA)",    "M"),
    ("mb-fr4",    "♀  FR-4 · Femme douce (MBROLA)",      "F"),
    ("roa/fr",    "♂  eSpeak · France",                  "M"),
    ("roa/fr-BE", "♂  eSpeak · Belgique",                "M"),
    ("roa/fr-CH", "♂  eSpeak · Suisse",                  "M"),
]

def _espeak_bin() -> str:
    """Return first working espeak-ng binary path."""
    candidates = [
        "espeak-ng",
        "/opt/homebrew/bin/espeak-ng",   # macOS Apple Silicon
        "/usr/local/bin/espeak-ng",       # macOS Intel
        "/usr/bin/espeak-ng",
    ]
    for cmd in candidates:
        try:
            r = subprocess.run([cmd, "--version"], capture_output=True, timeout=4)
            if r.returncode == 0:
                return cmd
        except Exception:
            pass
    return "espeak-ng"  # fallback — will fail at synthesis time with a clear error

ESPEAK = _espeak_bin()

def _voice_available(voice_id: str) -> bool:
    try:
        tmp = tempfile.NamedTemporaryFile(delete=True, suffix=".wav")
        tmp.close()
        r = subprocess.run(
            [ESPEAK, "-v", voice_id, "-w", tmp.name, "test"],
            capture_output=True, timeout=6,
        )
        return r.returncode == 0
    except Exception:
        return False

VOICES       = [(vid, label, g) for vid, label, g in _ALL_VOICES if _voice_available(vid)]
VOICE_MAP    = {label: vid   for vid, label, _ in VOICES}
VOICE_LABELS = [label        for _,   label, _ in VOICES]

if not VOICE_LABELS:
    raise RuntimeError(
        f"사용 가능한 프랑스어 음성이 없습니다.\n"
        f"espeak-ng 경로: {ESPEAK}\n"
        f"설치 확인: brew install espeak-ng  (macOS) / apt install espeak-ng  (Linux)"
    )

SAMPLES = [
    "Bonjour, comment allez-vous aujourd'hui ?",
    "La vie est belle et pleine de surprises magnifiques.",
    "Je voudrais apprendre le français couramment.",
    "Paris est la ville de l'amour et de la lumière.",
    "Merci beaucoup pour votre aide précieuse.",
    "Il fait beau aujourd'hui, n'est-ce pas ?",
]

CSS = """
/* ── Pixel Beach · Pastel Purple Theme ── */
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

/* ── background: night-sky purple → ocean → sand ── */
html, body {
    background: linear-gradient(180deg,
        #150829  0%,
        #2D1B69 12%,
        #4B2D8A 25%,
        #7B5EA7 40%,
        #A888CC 52%,
        #C9AEE8 62%,
        #E2D0F5 70%,
        #F5EEFB 76%,
        #F8EEE0 82%,
        #F0D9B5 90%,
        #E0C080 100%
    ) fixed !important;
    min-height: 100vh;
}

.gradio-container {
    background: transparent !important;
    max-width: 900px !important;
    margin: 0 auto !important;
    padding-bottom: 48px !important;
    font-family: 'Courier New', monospace !important;
}

/* ── Header ── */
.pb-header {
    font-family: 'Press Start 2P', 'Courier New', monospace;
    text-align: center;
    padding: 36px 20px 0;
    user-select: none;
}

.pb-stars {
    font-size: 0.75rem;
    color: #C9AEE8;
    letter-spacing: 6px;
    opacity: 0.9;
    margin-bottom: 14px;
    animation: star-twinkle 4s ease-in-out infinite;
}

@keyframes star-twinkle {
    0%,100% { opacity: 0.9; }
    50%      { opacity: 0.4; }
}

.pb-sun {
    display: inline-block;
    width: 16px; height: 16px;
    background: #FFE566;
    image-rendering: pixelated;
    box-shadow:
        /* ray spokes — 8 px grid */
        -16px -16px 0 #FFE566,  0px -16px 0 #FFE566,  16px -16px 0 #FFE566,
        -16px   0px 0 #FFE566,                          16px   0px 0 #FFE566,
        -16px  16px 0 #FFE566,  0px  16px 0 #FFE566,  16px  16px 0 #FFE566,
        /* glow core */
        -8px  -8px  0 #FFF0A0, 0px  -8px  0 #FFF0A0,  8px  -8px  0 #FFF0A0,
        -8px   0px  0 #FFF0A0,  8px   0px  0 #FFF0A0,
        -8px   8px  0 #FFF0A0,  0px   8px  0 #FFF0A0,  8px   8px  0 #FFF0A0;
    margin-bottom: 20px;
}

.pb-title {
    font-size: 1.25rem;
    color: #F5EEFB;
    text-shadow: 4px 4px 0 #2D1B69, 8px 8px 0 #150829;
    letter-spacing: 3px;
    margin-bottom: 10px;
    line-height: 1.6;
}

.pb-subtitle {
    font-size: 0.42rem;
    color: #C9AEE8;
    letter-spacing: 5px;
    text-shadow: 2px 2px 0 #2D1B69;
    margin-bottom: 16px;
}

.pb-waves {
    font-size: 2rem;
    letter-spacing: -3px;
    color: #A888CC;
    text-shadow: 3px 3px 0 #7B5EA7, 6px 6px 0 #4B2D8A;
    animation: wave-bob 2.4s ease-in-out infinite;
    margin-bottom: 4px;
}

@keyframes wave-bob {
    0%,100% { transform: translateY(0px);   }
    50%      { transform: translateY(-5px);  }
}

/* ── Panels / blocks ── */
.gradio-container .block,
.gradio-container .form {
    border-radius: 0 !important;
    border: 3px solid #A888CC !important;
    background: rgba(245, 238, 251, 0.93) !important;
    box-shadow: 6px 6px 0 #7B5EA7, 12px 12px 0 rgba(75,45,138,0.25) !important;
}

/* ── Text area ── */
.gradio-container textarea,
.gradio-container input[type=text] {
    border: 3px solid #A888CC !important;
    border-radius: 0 !important;
    background: #FBF7FF !important;
    font-family: 'Courier New', monospace !important;
    font-size: 0.95rem !important;
    color: #2D1B69 !important;
    box-shadow: inset 3px 3px 0 #E2D0F5 !important;
    padding: 12px !important;
    transition: border-color 0.1s !important;
}

.gradio-container textarea:focus,
.gradio-container input[type=text]:focus {
    border-color: #7B5EA7 !important;
    box-shadow: inset 3px 3px 0 #C9AEE8, 0 0 0 4px rgba(168,136,204,0.25) !important;
    outline: none !important;
}

.gradio-container textarea::placeholder { color: #C9AEE8 !important; font-style: italic; }

/* ── Dropdown ── */
.gradio-container select {
    border: 3px solid #A888CC !important;
    border-radius: 0 !important;
    background: #FBF7FF !important;
    color: #2D1B69 !important;
    font-family: 'Courier New', monospace !important;
    font-size: 0.85rem !important;
    box-shadow: 3px 3px 0 #A888CC !important;
    padding: 8px 12px !important;
}

/* ── Sliders ── */
.gradio-container input[type=range] {
    accent-color: #7B5EA7 !important;
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
}

/* ── Labels ── */
.gradio-container .label-wrap span,
.gradio-container label > span {
    color: #4B2D8A !important;
    font-family: 'Courier New', monospace !important;
    font-weight: 700 !important;
    font-size: 0.78rem !important;
    text-transform: uppercase !important;
    letter-spacing: 0.8px !important;
}

.gradio-container .info {
    color: #A888CC !important;
    font-family: 'Courier New', monospace !important;
    font-size: 0.7rem !important;
}

/* ── Markdown text ── */
.gradio-container .prose p,
.gradio-container .md p,
.gradio-container p {
    color: #4B2D8A !important;
    font-family: 'Courier New', monospace !important;
    font-weight: 700 !important;
    font-size: 0.78rem !important;
    letter-spacing: 0.5px !important;
}

/* ── PRIMARY button ── */
.gradio-container button.primary {
    background: #7B5EA7 !important;
    color: #F5EEFB !important;
    border: 4px solid #4B2D8A !important;
    border-radius: 0 !important;
    box-shadow: 7px 7px 0 #2D1B69, 14px 14px 0 rgba(21,8,41,0.3) !important;
    font-family: 'Press Start 2P', 'Courier New', monospace !important;
    font-size: 0.6rem !important;
    letter-spacing: 3px !important;
    padding: 18px 28px !important;
    text-transform: uppercase !important;
    cursor: pointer !important;
    width: 100% !important;
    transition: none !important;
}

.gradio-container button.primary:hover {
    background: #9B7FC7 !important;
    transform: translate(-3px, -3px) !important;
    box-shadow: 10px 10px 0 #2D1B69, 18px 18px 0 rgba(21,8,41,0.2) !important;
}

.gradio-container button.primary:active {
    transform: translate(6px, 6px) !important;
    box-shadow: 1px 1px 0 #2D1B69 !important;
}

/* ── SECONDARY buttons (samples) ── */
.gradio-container button.secondary {
    background: #EDE0F8 !important;
    color: #4B2D8A !important;
    border: 2px solid #A888CC !important;
    border-radius: 0 !important;
    box-shadow: 3px 3px 0 #7B5EA7 !important;
    font-family: 'Courier New', monospace !important;
    font-size: 0.75rem !important;
    transition: none !important;
    text-align: left !important;
    padding: 8px 12px !important;
    white-space: normal !important;
    cursor: pointer !important;
}

.gradio-container button.secondary:hover {
    background: #DEC8F8 !important;
    transform: translate(-2px, -2px) !important;
    box-shadow: 5px 5px 0 #7B5EA7 !important;
}

.gradio-container button.secondary:active {
    transform: translate(2px, 2px) !important;
    box-shadow: 1px 1px 0 #7B5EA7 !important;
}

/* ── Audio ── */
.gradio-container audio {
    border: 3px solid #A888CC !important;
    border-radius: 0 !important;
    background: #EDE0F8 !important;
}

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #E2D0F5; }
::-webkit-scrollbar-thumb { background: #A888CC; border-radius: 0; }
::-webkit-scrollbar-thumb:hover { background: #7B5EA7; }

/* ── Footer ── */
.pb-footer {
    font-family: 'Press Start 2P', monospace;
    text-align: center;
    padding: 24px 0 8px;
    font-size: 1.4rem;
    color: #C9AEE8;
    text-shadow: 3px 3px 0 #A888CC;
    letter-spacing: 6px;
    animation: wave-bob 3s ease-in-out infinite;
}
"""

# ── TTS function ────────────────────────────────────────────────────────────

def synthesize(text: str, voice_label: str, rate: int, pitch: int, volume: int) -> str:
    if not text or not text.strip():
        raise gr.Error("텍스트를 입력해 주세요.")
    voice_id = VOICE_MAP[voice_label]
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    tmp.close()
    subprocess.run(
        [ESPEAK, "-v", voice_id, "-s", str(rate), "-p", str(pitch),
         "-a", str(volume), "-w", tmp.name, text.strip()],
        check=True, capture_output=True,
    )
    return tmp.name

# ── UI ───────────────────────────────────────────────────────────────────────

with gr.Blocks(title="🌊 French TTS") as demo:

    # ── Header ──────────────────────────────────────────────────────────────
    gr.HTML("""
    <div class="pb-header">
      <div class="pb-stars">✦ ˚ · ⋆ ˚ ✦ · ˚ ⋆ ✦ ˚ · ⋆ ˚ ✦ · ˚ ⋆ ✦</div>
      <div style="display:flex;justify-content:center;align-items:center;gap:40px;margin:8px 0 20px;">
        <div class="pb-sun"></div>
        <div>
          <div class="pb-title">🇫🇷 FRENCH TTS</div>
          <div class="pb-subtitle">✦ &nbsp; SYNTHÈSE VOCALE FRANÇAISE &nbsp; ✦</div>
        </div>
        <div class="pb-sun"></div>
      </div>
      <div class="pb-waves">〰〰〰〰〰〰〰〰〰〰〰〰〰</div>
    </div>
    """)

    # ── Main content ─────────────────────────────────────────────────────────
    with gr.Row():

        # Left: text + samples
        with gr.Column(scale=3):
            text_input = gr.Textbox(
                label="📝  Texte Français",
                placeholder="Entrez votre texte en français ici...",
                lines=7,
                max_lines=14,
            )
            gr.Markdown("**✦  Exemples de phrases  ✦**")
            with gr.Row():
                for s in SAMPLES[:3]:
                    b = gr.Button(s, size="sm", variant="secondary")
                    b.click(fn=lambda x=s: x, outputs=text_input)
            with gr.Row():
                for s in SAMPLES[3:]:
                    b = gr.Button(s, size="sm", variant="secondary")
                    b.click(fn=lambda x=s: x, outputs=text_input)

        # Right: controls
        with gr.Column(scale=2):
            voice_select = gr.Dropdown(
                label="🎙️  Voix",
                choices=VOICE_LABELS,
                value=VOICE_LABELS[0],
            )
            rate_slider = gr.Slider(
                label="⚡  Vitesse",
                minimum=80, maximum=300, value=150, step=10,
                info="mots/min  ·  기본 150",
            )
            pitch_slider = gr.Slider(
                label="🎵  Tonalité",
                minimum=0, maximum=99, value=50, step=5,
                info="0 grave ··· 99 aigu  ·  기본 50",
            )
            volume_slider = gr.Slider(
                label="🔊  Volume",
                minimum=50, maximum=200, value=100, step=10,
                info="50 ··· 200  ·  기본 100",
            )

    # ── Generate button ──────────────────────────────────────────────────────
    speak_btn = gr.Button(
        "▶  GÉNÉRER LA VOIX  ◀",
        variant="primary",
        size="lg",
    )

    # ── Audio output ─────────────────────────────────────────────────────────
    audio_output = gr.Audio(
        label="🌊  Audio généré",
        type="filepath",
        autoplay=True,
    )

    # ── Footer ───────────────────────────────────────────────────────────────
    gr.HTML('<div class="pb-footer">🏖️ &nbsp; ～ ～ 🐚 ～ ～ &nbsp; 🏖️</div>')

    # ── Events ───────────────────────────────────────────────────────────────
    inputs = [text_input, voice_select, rate_slider, pitch_slider, volume_slider]
    speak_btn.click(fn=synthesize, inputs=inputs, outputs=audio_output)
    text_input.submit(fn=synthesize, inputs=inputs, outputs=audio_output)

if __name__ == "__main__":
    demo.launch(css=CSS)
