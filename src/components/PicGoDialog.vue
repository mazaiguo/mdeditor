<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-box picgo-modal">
        <div class="modal-header">
          <h3>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-3px; margin-right:6px">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            Image Upload (PicGo)
          </h3>
          <button class="modal-close" @click="$emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
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
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
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
import { useLocalStorage } from '@vueuse/core'

defineProps<{ visible: boolean }>()

const emit = defineEmits<{
  close: []
  insert: [markdown: string]
}>()

const defaultPicGoUrl = 'http://127.0.0.1:36677'
const serverUrl = useLocalStorage('picgo-server-url', defaultPicGoUrl)
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

  const base = serverUrl.value.replace(/\/$/, '')
  const fieldNames = ['files', 'list[]']
  let lastErr = ''

  for (const fieldName of fieldNames) {
    try {
      const formData = new FormData()
      imageFiles.forEach(f => formData.append(fieldName, f))

      const res = await fetch(`${base}/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (data.success && data.result?.length) {
        const newItems = (data.result as string[]).map((url: string, i: number) => ({
          name: imageFiles[i]?.name ?? `image-${i + 1}`,
          url,
        }))
        uploadedUrls.value.push(...newItems)
        isUploading.value = false
        return
      }
      lastErr = data.message || 'Upload failed'
    } catch (err: any) {
      lastErr = err.message
    }
  }
  errorMsg.value = `Upload failed: ${lastErr}. Make sure PicGo Server is running on ${base}`
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
