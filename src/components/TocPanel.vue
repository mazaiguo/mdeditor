<template>
  <div class="side-panel-body">
    <div v-if="headings.length === 0" class="side-empty">
      <p>No headings found</p>
    </div>
    <ul v-else class="toc-list">
      <li
        v-for="(heading, idx) in headings"
        :key="idx"
        class="toc-item"
        :class="[`toc-level-${heading.level}`, { active: heading.id === activeId }]"
        @click="$emit('scroll', heading.id)"
      >
        <span class="toc-item-text" v-html="heading.html"></span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  headings: Array<{ level: number; text: string; html: string; id: string }>
  activeId?: string
}>()

defineEmits<{
  scroll: [id: string]
}>()
</script>
