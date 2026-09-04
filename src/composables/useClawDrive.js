import { onBeforeUnmount, ref } from 'vue'

const MAX_SPEED = 70 // % of track per second
const ACCEL = 260 // % per second^2 while a direction is held
const DECEL = 340 // % per second^2 once released
const MIN_X = 11
const MAX_X = 89

// Velocity-based left/right motion for the claw: accelerates while a
// direction is held, decelerates to a stop on release. Never snaps.
export function useClawDrive(initial = 50) {
  const x = ref(initial)
  let vx = 0
  let dir = 0
  let rafId = null
  let last = 0

  function frame(t) {
    if (!last) last = t
    const dt = Math.min(0.05, (t - last) / 1000)
    last = t

    if (dir !== 0) {
      vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, vx + dir * ACCEL * dt))
    } else if (vx !== 0) {
      const sign = Math.sign(vx)
      vx -= sign * DECEL * dt
      if (Math.sign(vx) !== sign) vx = 0
    }

    let next = x.value + vx * dt
    if (next <= MIN_X) { next = MIN_X; vx = 0 }
    if (next >= MAX_X) { next = MAX_X; vx = 0 }
    x.value = next

    if (dir !== 0 || vx !== 0) {
      rafId = requestAnimationFrame(frame)
    } else {
      rafId = null
      last = 0
    }
  }

  function ensureLoop() {
    if (!rafId) {
      last = 0
      rafId = requestAnimationFrame(frame)
    }
  }

  function press(direction) {
    dir = direction
    ensureLoop()
  }
  function release() {
    dir = 0
    ensureLoop()
  }
  function stop() {
    dir = 0
    vx = 0
    if (rafId) cancelAnimationFrame(rafId)
    rafId = null
    last = 0
  }
  function setX(val) {
    x.value = val
    vx = 0
    dir = 0
  }

  onBeforeUnmount(stop)

  return { x, press, release, stop, setX }
}
