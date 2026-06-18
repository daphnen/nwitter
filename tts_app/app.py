import subprocess
import tempfile
import os
import gradio as gr

# espeak-ng French voices (voice_id, display_name, gender)
VOICES = [
    ("mb-fr1", "FR1 · 남성 (MBROLA)", "M"),
    ("mb-fr2", "FR2 · 여성 (MBROLA)", "F"),
    ("mb-fr3", "FR3 · 남성 (MBROLA)", "M"),
    ("mb-fr4", "FR4 · 여성 (MBROLA)", "F"),
    ("roa/fr", "French France · 남성", "M"),
    ("roa/fr-BE", "French Belgium · 남성", "M"),
    ("roa/fr-CH", "French Switzerland · 남성", "M"),
]

VOICE_MAP = {label: vid for vid, label, _ in VOICES}
VOICE_LABELS = [label for _, label, _ in VOICES]

SAMPLES = [
    "Bonjour, comment allez-vous aujourd'hui ?",
    "La vie est belle et pleine de surprises magnifiques.",
    "Je voudrais apprendre le français couramment.",
    "Paris est la ville de l'amour et de la lumière.",
    "Merci beaucoup pour votre aide précieuse.",
    "Il fait beau aujourd'hui, n'est-ce pas ?",
]


def synthesize(text: str, voice_label: str, rate: int, pitch: int, volume: int) -> str:
    if not text or not text.strip():
        raise gr.Error("텍스트를 입력해 주세요.")

    voice_id = VOICE_MAP[voice_label]
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    tmp.close()

    cmd = [
        "espeak-ng",
        "-v", voice_id,
        "-s", str(rate),    # speed: words/min
        "-p", str(pitch),   # pitch: 0-99
        "-a", str(volume),  # amplitude: 0-200
        "-w", tmp.name,
        text.strip(),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return tmp.name


with gr.Blocks(
    title="French TTS",
    theme=gr.themes.Soft(primary_hue="blue", secondary_hue="red"),
    css="""
    .header { text-align: center; padding: 20px 0 8px; }
    .header h1 { font-size: 2rem; color: #003189; margin-bottom: 4px; }
    .header p  { color: #666; margin: 0; font-size: 0.9rem; }
    """,
) as demo:

    gr.HTML("""
    <div class="header">
      <h1>🇫🇷 Synthèse Vocale Française</h1>
      <p>French Text-to-Speech · espeak-ng + MBROLA (offline)</p>
    </div>
    """)

    with gr.Row():
        with gr.Column(scale=3):
            text_input = gr.Textbox(
                label="텍스트 입력 (Texte français)",
                placeholder="Entrez votre texte en français ici...",
                lines=6,
                max_lines=12,
            )

            gr.Markdown("**예시 문장 (Exemples) :**")
            with gr.Row():
                for sample in SAMPLES[:3]:
                    btn = gr.Button(sample, size="sm", variant="secondary")
                    btn.click(fn=lambda s=sample: s, outputs=text_input)
            with gr.Row():
                for sample in SAMPLES[3:]:
                    btn = gr.Button(sample, size="sm", variant="secondary")
                    btn.click(fn=lambda s=sample: s, outputs=text_input)

        with gr.Column(scale=2):
            voice_select = gr.Dropdown(
                label="음성 선택 (Voix)",
                choices=VOICE_LABELS,
                value=VOICE_LABELS[0],
            )
            rate_slider = gr.Slider(
                label="속도 (Vitesse)",
                minimum=80,
                maximum=300,
                value=150,
                step=10,
                info="단어/분 · 기본값 150",
            )
            pitch_slider = gr.Slider(
                label="음높이 (Tonalité)",
                minimum=0,
                maximum=99,
                value=50,
                step=5,
                info="0 (낮음) ~ 99 (높음) · 기본값 50",
            )
            volume_slider = gr.Slider(
                label="볼륨 (Volume)",
                minimum=50,
                maximum=200,
                value=100,
                step=10,
                info="0 ~ 200 · 기본값 100",
            )

    speak_btn = gr.Button("▶ 음성 생성 (Générer)", variant="primary", size="lg")

    audio_output = gr.Audio(
        label="생성된 음성 (Audio généré)",
        type="filepath",
        autoplay=True,
    )

    speak_btn.click(
        fn=synthesize,
        inputs=[text_input, voice_select, rate_slider, pitch_slider, volume_slider],
        outputs=audio_output,
    )

    # Enter 키로도 생성
    text_input.submit(
        fn=synthesize,
        inputs=[text_input, voice_select, rate_slider, pitch_slider, volume_slider],
        outputs=audio_output,
    )

if __name__ == "__main__":
    demo.launch()
