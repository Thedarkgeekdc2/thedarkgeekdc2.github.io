let enabled = false;

export function setSoundsEnabled(value) {
  enabled = Boolean(value);
}

export function soundsEnabled() {
  return enabled;
}

export function playSound(path) {
  if(!enabled || !path) return;
  try {
    const audio = new Audio(path);
    audio.preload='auto';
    audio.play().catch(()=>{});
  } catch {}
}
