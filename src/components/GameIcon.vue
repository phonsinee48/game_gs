<script setup>
defineProps({
  name: { type: String, required: true },
})

const paths = {
  'chevron-left': 'M15 5l-7 7 7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  back: 'M20 12H5M11 6l-6 6 6 6',
  vibrate: 'M4 9l-1.4-1.4M4 15l-1.4 1.4M20 9l1.4-1.4M20 15l1.4 1.4',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 12V5M3 12h7',
  clock: 'M12 7v5l3.2 2',
}
</script>

<template>
  <svg
    v-if="name === 'ticket'"
    class="g-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linejoin="round"
  >
    <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.2a1.6 1.6 0 0 0 0 3.6V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.2a1.6 1.6 0 0 0 0-3.6V9Z" />
    <path d="M14 7.5v9" stroke-dasharray="2.4 2.4" stroke-linecap="round" />
  </svg>
  <svg
    v-else-if="name === 'gift'"
    class="g-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="3.5" y="9" width="17" height="11" rx="1.4" />
    <path d="M3.5 13.2h17" />
    <path d="M12 9v11" />
    <path d="M12 9C9.8 9 8 7.8 8 6.2 8 4.9 9 4 10.1 4 11.6 4 12 6.4 12 9Z" />
    <path d="M12 9c2.2 0 4-1.2 4-2.8C16 4.9 15 4 13.9 4 12.4 4 12 6.4 12 9Z" />
  </svg>
  <svg
    v-else-if="name === 'history'"
    class="g-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path :d="paths.history" />
    <path :d="paths.clock" stroke-linecap="round" />
  </svg>
  <svg
    v-else-if="name === 'swap'"
    class="g-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.1"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M4 8h13M13 4l4 4-4 4" />
    <path d="M20 16H7M11 12l-4 4 4 4" />
  </svg>
  <svg
    v-else-if="name === 'grab'"
    class="g-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M7 3v5.2c0 2.4 1.9 3.8 5 3.8s5-1.4 5-3.8V3" />
    <path d="M12 12v9" />
    <path d="M8.6 21h6.8" />
  </svg>
  <svg
    v-else-if="name === 'star'"
    class="g-icon"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 2.6l2.94 6.36 6.98.62-5.28 4.6 1.6 6.86L12 17.9l-6.24 3.14 1.6-6.86-5.28-4.6 6.98-.62L12 2.6z" />
  </svg>
  <svg
    v-else-if="name === 'speaker'"
    class="g-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4Z" fill="currentColor" stroke="none" />
    <path d="M17 9a4 4 0 0 1 0 6M19.5 6.5a7.5 7.5 0 0 1 0 11" />
  </svg>
  <svg
    v-else-if="name === 'speaker-off'"
    class="g-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4Z" fill="currentColor" stroke="none" />
    <path d="M16.5 10 21 14.5M21 10l-4.5 4.5" />
  </svg>
  <svg
    v-else-if="name === 'home'"
    class="g-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M4 11.5 12 4l8 7.5" />
    <path d="M6 10v9h12v-9" />
  </svg>
  <svg
    v-else-if="name === 'vibrate'"
    class="g-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="8" y="3" width="8" height="18" rx="2.2" fill="none" />
    <path :d="paths.vibrate" />
  </svg>
  <svg
    v-else
    class="g-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.4"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path :d="paths[name]" />
  </svg>
</template>

<style scoped>
.g-icon { width: 1em; height: 1em; display: block; }
</style>
