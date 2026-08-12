<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-box picgo-modal">
        <div class="modal-header">
          <h3>
            <Icon name="image" :size="16" style="vertical-align:-3px; margin-right:6px" />
            Image Upload (PicGo)
          </h3>
          <button class="modal-close" @click="$emit('close')">
            <Icon name="close" :size="16" />
          </button>
        </div>

        <div class="modal-body">
          <div class="picgo-server-row">
            <label>PicGo Server</label>
            <input
              v-model="serverUrl"
              type="text"
              placeholder="http://127.0.0.1:36677"
              class="picgo-input"
            />
          </div>
          <div class="picgo-tip">
            <Icon name="info" :size="12" />
            PicGo 请求由<b>浏览器</b>直接发起。已自动使用当前页面的主机地址作为默认值。若 PicGo 在 NAS 上运行，保持默认即可；若在本机，请改为 <code>http://127.0.0.1:36677</code>。
          </div>

          <div
            class="picgo-drop-zone"
            :class="{ 'dragging': isDragging, 'uploading': isUploading }"
            @dragover.prevent="isDragging = true"
            @dragleave="isDragging = false"
            @drop.prevent="handleDrop"
            @click="fileInput?.click()"
          >
            <input ref="fileInput" type="file" accept="image/*" multiple style="display:none" @change="handleFileChange" />

            <template v-if="isUploading">
              <div class="picgo-spinner" />
              <p>Uploading...</p>
            </template>
            <template v-else>
              <Icon name="upload" :size="32" :stroke-width="1.5" />
              <p>Click or drag images here to upload</p>
              <span>Supports PNG, JPG, GIF, WebP, SVG</span>
            </template>
          </div>

          <div v-if="uploadedUrls.length > 0" class="picgo-results">
            <div class="picgo-results-title">Uploaded Images</div>
            <div
              v-for="(item, i) in uploadedUrls"
              :key="i"
              class="picgo-result-item"
            >
              <img :src="item.url" :alt="item.name" class="picgo-preview" />
              <div class="picgo-result-info">
                <span class="picgo-result-name">{{ item.name }}</span>
                <div class="picgo-result-actions">
                  <button class="picgo-insert-btn" @click="insertImage(item)">Insert</button>
                  <button class="picgo-copy-btn" @click="copyUrl(item.url)">Copy URL</button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="errorMsg" class="picgo-error">
            {{ errorMsg }}
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Icon from './Icon.vue'
import { usePicgoServer } from '../composables/usePicgo'
import { uploadFilesToPicGo } from '../utils/picgo'

defineProps<{ visible: boolean }>()

const emit = defineEmits<{
  close: []
  insert: [markdown: string]
}>()

const serverUrl = usePicgoServer()
const fileInput = ref<HTMLInputElement>()
const isDragging = ref(false)
const isUploading = ref(false)
const errorMsg = ref('')
const uploadedUrls = ref<Array<{ name: string; url: string }>>([])

async function uploadFiles(files: File[]) {
  const imageFiles = files.filter(f => f.type.startsWith('image/'))
  if (imageFiles.length === 0) return

  isUploading.value = true
  errorMsg.value = ''

  const urls = await uploadFilesToPicGo(serverUrl.value, imageFiles)
  if (urls) {
    const newItems = urls.map((url, i) => ({
      name: imageFiles[i]?.name ?? `image-${i + 1}`,
      url,
    }))
    uploadedUrls.value.push(...newItems)
  } else {
    const base = serverUrl.value.replace(/\/$/, '')
    errorMsg.value = `Upload failed. Make sure PicGo Server is running on ${base}`
  }
  isUploading.value = false
}

function handleDrop(e: DragEvent) {
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files ?? [])
  uploadFiles(files)
}

function handleFileChange(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  uploadFiles(files)
  if (fileInput.value) fileInput.value.value = ''
}

function insertImage(item: { name: string; url: string }) {
  const alt = item.name.replace(/\.[^.]+$/, '')
  emit('insert', `![${alt}](${item.url})`)
  emit('close')
}

function copyUrl(url: string) {
  navigator.clipboard.writeText(url)
}
</script>
