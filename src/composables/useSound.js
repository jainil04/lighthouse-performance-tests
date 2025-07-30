// src/composables/useSound.js
export function useSound({ src, volume = 1.0 }) {
  const audio = new Audio(src)
  audio.volume = volume
  audio.load()
  function play() {
    audio.currentTime = 0
    audio.play().catch(()=>{})
  }
  return { play }
}
