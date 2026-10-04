// Local synthesis only: no audio download, timers, or database activity.
export function createGachaSound() {
  let context;
  let nodes = [];
  let muted = false;
  function stop() {
    nodes.forEach(node => { try { node.stop(); } catch { /* Already ended. */ } });
    nodes = [];
  }
  function tone(delay, frequency, duration, volume, noise = false) {
    if (!context || muted) return;
    const at = context.currentTime + delay;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + .004);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    gain.connect(context.destination);
    let source;
    if (noise) {
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      source = context.createBufferSource(); source.buffer = buffer;
      const filter = context.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = 2;
      source.connect(filter); filter.connect(gain);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    } else {
      source = context.createOscillator(); source.type = 'sine';
      source.frequency.setValueAtTime(frequency, at);
      source.frequency.exponentialRampToValueAtTime(frequency * .65, at + duration);
      source.connect(gain);
      source.onended = () => { source.disconnect(); gain.disconnect(); };
    }
    nodes.push(source); source.start(at); source.stop(at + duration + .02);
  }
  return {
    setMuted(value) { muted = value; if (muted) stop(); },
    start() {
      stop(); if (muted) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        context ||= new AudioContext();
        context.resume().catch(() => {});
        for (let i = 0; i < 19; i++) {
          const delay = .08 + i * .135 + (i > 13 ? (i - 13) * .035 : 0);
          tone(delay, 850 + i % 4 * 160, .045, .045, true);
          if (i % 3 === 0) tone(delay + .03, 250, .07, .025);
        }
      } catch { /* Sound must never block a purchase. */ }
    },
    reveal(won) {
      stop();
      try {
        tone(.45, 190, .13, .08);
        tone(.65, 320, .08, .04);
        tone(.84, 420, .05, .02);
        tone(1, 1500, .06, .035, true);
        if (won) { tone(1.3, 660, .2, .035); tone(1.45, 880, .3, .035); }
      } catch { /* Silent fallback for unsupported audio devices. */ }
    },
    stop,
    dispose() { stop(); if (context) { context.close().catch(() => {}); context = null; } },
  };
}
