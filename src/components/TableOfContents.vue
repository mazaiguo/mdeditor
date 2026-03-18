<template>
  <div class="toc-panel">
    <div class="toc-header">
      <span class="toc-title">Contents</span>
    </div>
    <div class="toc-content">
      <div
        v-if="headings.length === 0"
        class="toc-empty"
      >
        No headings found
      </div>
      <ul v-else class="toc-list">
        <li
          v-for="(heading, idx) in headings"
          :key="idx"
          class="toc-item"
          :class="`toc-level-${heading.level}`"
          @click="scrollToHeading(heading.id)"
        >
          <span class="toc-item-text">{{ heading.text }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  headings: Array<{ level: number; text: string; id: string }>
}>()

function scrollToHeading(id: string) {
  const previewEl = document.querySelector('.preview-pane')
  if (!previewEl) return
  const target = previewEl.querySelector(`[id="${id}"]`)
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>
