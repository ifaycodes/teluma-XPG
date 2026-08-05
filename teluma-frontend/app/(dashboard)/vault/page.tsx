'use client'
import { useEffect, useState, useRef } from 'react'
import api from '@/lib/api'
import { VaultDocument, StorageInfo } from '@/lib/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { OFFSET, OFFSET_BTN } from '@/lib/theme'

const TAGS = ['legal', 'tax', 'cv', 'financial', 'organizational', 'other']

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function TagBadge({ tag }: { tag: string }) {
  const colors: Record<string, string> = {
    legal: 'bg-blue-50 text-blue-700',
    tax: 'bg-yellow-50 text-yellow-700',
    cv: 'bg-purple-50 text-purple-700',
    financial: 'bg-green-50 text-green-700',
    organizational: 'bg-orange-50 text-orange-700',
    other: 'bg-[#1C1C1C]/5 text-[#2C1A0E]/60',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors[tag] || colors.other}`}>
      {tag}
    </span>
  )
}

function FileIcon({ fileType }: { fileType: string }) {
  const isPdf = fileType.includes('pdf')
  const isDoc = fileType.includes('word') || fileType.includes('document')
  const icon = isPdf ? 'picture_as_pdf' : isDoc ? 'description' : 'draft'
  const color = isPdf ? 'text-[#A8192E]' : isDoc ? 'text-[#1C1C1C]/70' : 'text-[#2C1A0E]/50'
  return <span className={`material-symbols-outlined text-3xl ${color}`}>{icon}</span>
}

export default function VaultPage() {
  const [docs, setDocs] = useState<VaultDocument[]>([])
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [activeTag, setActiveTag] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renamingValue, setRenamingValue] = useState('')
  const [uploadForm, setUploadForm] = useState({ name: '', tag: 'legal' })
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDocs()
    fetchStorage()
  }, [])

  async function fetchDocs() {
    try {
      const res = await api.get('/vault/')
      setDocs(res.data)
    } catch (err) {
      console.error('Failed to fetch docs:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStorage() {
    try {
      const res = await api.get('/vault/storage')
      setStorage(res.data)
    } catch (err) {
      console.error('Failed to fetch storage:', err)
    }
  }

  function handleFileSelect(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      alert('File too large. Maximum size is 15MB.')
      return
    }
    setPendingFile(file)
    setUploadForm({ ...uploadForm, name: file.name.replace(/\.[^/.]+$/, '') })
    setShowUploadModal(true)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!pendingFile) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', pendingFile)
      formData.append('name', uploadForm.name)
      formData.append('tag', uploadForm.tag)
      await api.post('/vault/upload', formData)
      setShowUploadModal(false)
      setPendingFile(null)
      setUploadForm({ name: '', tag: 'legal' })
      fetchDocs()
      fetchStorage()
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this document?')) return
    try {
      await api.delete(`/vault/${id}`)
      fetchDocs()
      fetchStorage()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  async function handleRename(id: string) {
    try {
      await api.patch(`/vault/${id}/rename?name=${encodeURIComponent(renamingValue)}`)
      setRenamingId(null)
      fetchDocs()
    } catch (err) {
      console.error('Rename failed:', err)
    }
  }

  async function handleDownload(id: string) {
    try {
      const res = await api.get(`/vault/${id}/download`)
      window.open(res.data.download_url, '_blank')
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  const filteredDocs = docs
    .filter(d => activeTag === 'all' || d.tag === activeTag)
    .filter(d => d.name.toLowerCase().includes(search.trim().toLowerCase()))

  const storagePercent = storage
    ? Math.round((storage.used_bytes / storage.limit_bytes) * 100)
    : 0

  return (
    <div className="max-w-7xl mx-auto">

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <p className="text-sm text-[#2C1A0E]/60">
          Centralized documents — accessible by agents during applications
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className={`flex items-center bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-lg px-3 flex-1 sm:w-56 ${OFFSET}`}>
            <span className="material-symbols-outlined text-[#2C1A0E]/40 text-lg mr-2">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none py-2 text-[#1C1C1C] placeholder:text-[#2C1A0E]/40"
            />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center justify-center gap-2 px-4 py-2 bg-[#A8192E] text-[#FDFAF4] rounded-lg text-sm font-semibold hover:bg-[#8f1526] transition-all ${OFFSET_BTN}`}
          >
            <span className="material-symbols-outlined text-xl">upload</span>
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">

        {/* Left column: folders + storage */}
        <aside className="space-y-4">
          <nav className={`bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-xl p-2 space-y-0.5 ${OFFSET}`}>
            <button
              onClick={() => setActiveTag('all')}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTag === 'all'
                  ? 'bg-[#A8192E] text-[#FDFAF4]'
                  : 'text-[#2C1A0E]/70 hover:bg-[#1C1C1C]/5'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">folder_open</span>
                All Files
              </span>
              <span className="text-xs">{docs.length}</span>
            </button>
            {TAGS.map(tag => {
              const count = docs.filter(d => d.tag === tag).length
              if (count === 0) return null
              return (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    activeTag === tag
                      ? 'bg-[#A8192E] text-[#FDFAF4]'
                      : 'text-[#2C1A0E]/70 hover:bg-[#1C1C1C]/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">folder</span>
                    {tag}
                  </span>
                  <span className="text-xs">{count}</span>
                </button>
              )
            })}
          </nav>

          {/* Storage widget */}
          {storage && (
            <div className={`bg-[#1C1C1C] text-[#FDFAF4] rounded-xl p-4 ${OFFSET}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#FDFAF4]/60">Storage Used</span>
                <span className="text-xs font-bold">
                  {storage.used_mb.toFixed(1)} / {storage.limit_mb.toFixed(0)}MB
                </span>
              </div>
              <div className="w-full bg-white/15 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    storagePercent > 80 ? 'bg-[#A8192E]' : 'bg-[#FDFAF4]'
                  }`}
                  style={{ width: `${Math.min(storagePercent, 100)}%` }}
                />
              </div>
              {storagePercent > 80 && (
                <p className="text-xs text-[#A8192E] mt-2 font-medium">
                  Running low on storage
                </p>
              )}
            </div>
          )}
        </aside>

        {/* Main column */}
        <div>
          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const file = e.dataTransfer.files[0]
              if (file) handleFileSelect(file)
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 cursor-pointer transition-all ${
              dragOver
                ? 'border-[#A8192E] bg-[#FDFAF4]'
                : 'border-[#1C1C1C]/15 hover:border-[#A8192E]/50 hover:bg-[#FDFAF4]'
            }`}
          >
            <span className="material-symbols-outlined text-4xl text-[#2C1A0E]/40 mb-3 block">
              upload_file
            </span>
            <p className="text-sm text-[#2C1A0E]/60">
              Drag & drop files here or{' '}
              <span className="text-[#A8192E] font-semibold">browse</span>
            </p>
            <p className="text-xs text-[#2C1A0E]/40 mt-1">PDF, DOCX up to 15MB</p>
          </div>

          {/* Documents */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-4 border-[#A8192E] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <EmptyState
              icon="folder_open"
              title={docs.length === 0 ? 'No documents yet' : 'No documents match your filters'}
              subtitle={docs.length === 0 ? 'Upload your organization documents to get started' : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className={`bg-[#FDFAF4] border border-[#1C1C1C]/10 rounded-xl p-4 ${OFFSET} hover:shadow-[5px_5px_0_0_#1C1C1C] transition-shadow group`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <FileIcon fileType={doc.file_type} />
                    <div className="flex-1 min-w-0">
                      {renamingId === doc.id ? (
                        <div className="flex gap-2">
                          <input
                            value={renamingValue}
                            onChange={(e) => setRenamingValue(e.target.value)}
                            className="text-sm border border-[#1C1C1C]/15 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-[#A8192E]"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(doc.id)
                              if (e.key === 'Escape') setRenamingId(null)
                            }}
                          />
                          <button
                            onClick={() => handleRename(doc.id)}
                            className="text-[#A8192E]"
                          >
                            <span className="material-symbols-outlined text-base">check</span>
                          </button>
                        </div>
                      ) : (
                        <h4 className="text-sm font-medium text-[#1C1C1C] truncate">{doc.name}</h4>
                      )}
                      <p className="text-xs text-[#2C1A0E]/50 mt-0.5">
                        {formatSize(doc.file_size_bytes)} · {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <TagBadge tag={doc.tag} />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDownload(doc.id)}
                        className="p-1.5 rounded-lg hover:bg-[#1C1C1C]/5 text-[#2C1A0E]/60 transition-colors"
                        title="Download"
                      >
                        <span className="material-symbols-outlined text-base">download</span>
                      </button>
                      <button
                        onClick={() => { setRenamingId(doc.id); setRenamingValue(doc.name) }}
                        className="p-1.5 rounded-lg hover:bg-[#1C1C1C]/5 text-[#2C1A0E]/60 transition-colors"
                        title="Rename"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 rounded-lg hover:bg-[#A8192E]/10 text-[#2C1A0E]/60 hover:text-[#A8192E] transition-colors"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-[#1C1C1C]/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FDFAF4] rounded-xl w-full max-w-md shadow-[0_8px_32px_rgba(28,28,28,0.18)]">
            <div className="flex items-center justify-between p-6 border-b border-[#1C1C1C]/10">
              <h3 className="text-lg font-bold text-[#1C1C1C]">Upload Document</h3>
              <button
                onClick={() => { setShowUploadModal(false); setPendingFile(null) }}
                className="p-2 rounded-lg hover:bg-[#1C1C1C]/5 text-[#2C1A0E]/60"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUpload}>
              <div className="p-6 space-y-4">
                {pendingFile && (
                  <div className="flex items-center gap-3 bg-[#F5F0E8] rounded-lg p-3">
                    <span className="material-symbols-outlined text-[#A8192E]">attach_file</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1C1C1C] truncate">{pendingFile.name}</p>
                      <p className="text-xs text-[#2C1A0E]/50">{formatSize(pendingFile.size)}</p>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-[#2C1A0E]/70 mb-1">
                    Document Name
                  </label>
                  <input
                    type="text"
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                    className="w-full border border-[#1C1C1C]/15 rounded-lg px-4 py-2.5 text-sm bg-[#F5F0E8] text-[#1C1C1C] focus:outline-none focus:border-[#A8192E]/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#2C1A0E]/70 mb-1">
                    Tag
                  </label>
                  <select
                    value={uploadForm.tag}
                    onChange={(e) => setUploadForm({ ...uploadForm, tag: e.target.value })}
                    className="w-full border border-[#1C1C1C]/15 rounded-lg px-4 py-2.5 text-sm bg-[#F5F0E8] text-[#1C1C1C] focus:outline-none focus:border-[#A8192E]/50 capitalize"
                  >
                    {TAGS.map(tag => (
                      <option key={tag} value={tag} className="capitalize">{tag}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6 border-t border-[#1C1C1C]/10 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className={`w-full py-2.5 bg-[#A8192E] text-[#FDFAF4] rounded-lg text-sm font-semibold hover:bg-[#8f1526] transition-all disabled:opacity-50 ${OFFSET_BTN}`}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowUploadModal(false); setPendingFile(null) }}
                  className="w-full py-2.5 border border-[#1C1C1C]/15 rounded-lg text-sm font-semibold text-[#1C1C1C] hover:bg-[#1C1C1C]/5 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
