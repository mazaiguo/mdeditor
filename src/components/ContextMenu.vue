<template>
  <Teleport to="body">
    <div
      v-if="visible"
      :class="menuClass"
      :style="{ left: x + 'px', top: y + 'px' }"
      @click.stop
    >
      <slot />
    </div>
    <div
      v-if="visible"
      :class="overlayClass"
      @click="$emit('close')"
      @contextmenu.prevent="$emit('close')"
    />
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Shared positioned context-menu shell: Teleport-to-body, absolute placement at
 * the cursor, an overlay that closes on outside click, and a slot for the menu
 * items. Replaces the duplicated menu markup in SidePanel and MarkdownPreview.
 */
withDefaults(defineProps<{
  visible: boolean
  x: number
  y: number
  menuClass?: string
  overlayClass?: string
}>(), {
  menuClass: 'context-menu',
  overlayClass: 'context-menu-overlay',
})

defineEmits<{ close: [] }>()
</script>
