import { ref, computed } from 'vue'

// File System Access API: the async `entries()` iterator exists at runtime but
// is missing from the project's TS 5.9 lib.dom.d.ts (the original code lived in
// a .vue file, which `tsc` does not type-check).
declare global {
  interface FileSystemDirectoryHandle {
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>
  }
}

export interface FileNode {
  name: string
  path: string
  kind: 'file' | 'directory'
  depth: number
  parentPath: string
  handle?: FileSystemFileHandle
}

function isMdFile(name: string): boolean {
  return /\.(md|markdown|txt)$/i.test(name)
}

/**
 * Folder → flat .md file tree state and operations.
 * Extracted from SidePanel; the component renders the result.
 *
 * @param onFileOpen called when a file is selected with (content, name, handle).
 */
export function useFileTree(onFileOpen: (content: string, name: string, handle: FileSystemFileHandle) => void) {
  const flatNodes = ref<FileNode[]>([])
  const folderName = ref('')
  const expandedDirs = ref(new Set<string>())

  async function scanDirectory(dirHandle: FileSystemDirectoryHandle, parentPath: string, depth: number): Promise<FileNode[]> {
    const result: FileNode[] = []
    const entries: { name: string; handle: FileSystemHandle }[] = []

    for await (const [name, handle] of dirHandle.entries()) {
      if (name.startsWith('.') || name === 'node_modules') continue
      entries.push({ name, handle })
    }

    const dirEntries = entries.filter(e => e.handle.kind === 'directory').sort((a, b) => a.name.localeCompare(b.name))
    const fileEntries = entries.filter(e => e.handle.kind === 'file' && isMdFile(e.name)).sort((a, b) => a.name.localeCompare(b.name))

    for (const entry of dirEntries) {
      const path = parentPath ? `${parentPath}/${entry.name}` : entry.name
      const children = await scanDirectory(entry.handle as FileSystemDirectoryHandle, path, depth + 1)
      if (children.length > 0) {
        result.push({ name: entry.name, path, kind: 'directory', depth, parentPath })
        result.push(...children)
      }
    }

    for (const entry of fileEntries) {
      const path = parentPath ? `${parentPath}/${entry.name}` : entry.name
      result.push({ name: entry.name, path, kind: 'file', depth, parentPath, handle: entry.handle as FileSystemFileHandle })
    }

    return result
  }

  /** Only nodes whose ancestor folders are all expanded. */
  const visibleNodes = computed(() => {
    const result: FileNode[] = []
    for (const node of flatNodes.value) {
      if (node.depth === 0) {
        result.push(node)
        continue
      }
      const parts = node.parentPath.split('/')
      let checkPath = ''
      let visible = true
      for (const part of parts) {
        checkPath = checkPath ? `${checkPath}/${part}` : part
        if (!expandedDirs.value.has(checkPath)) {
          visible = false
          break
        }
      }
      if (visible) result.push(node)
    }
    return result
  })

  function toggleFolder(path: string) {
    if (expandedDirs.value.has(path)) {
      expandedDirs.value.delete(path)
    } else {
      expandedDirs.value.add(path)
    }
    expandedDirs.value = new Set(expandedDirs.value)
  }

  async function openFolder() {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
      folderName.value = dirHandle.name
      expandedDirs.value = new Set()
      flatNodes.value = await scanDirectory(dirHandle, '', 0)
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('Failed to open folder:', err)
    }
  }

  async function selectFileNode(node: FileNode) {
    if (!node.handle) return
    try {
      const f = await node.handle.getFile()
      onFileOpen(await f.text(), node.name, node.handle)
    } catch (err) {
      console.error('Failed to read file:', err)
    }
  }

  return { flatNodes, folderName, expandedDirs, visibleNodes, toggleFolder, openFolder, selectFileNode }
}
