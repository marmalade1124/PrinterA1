import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { validateFileFormat, parseModel } from '../../lib/modelParser'

interface FileUploadZoneProps {
  onParsed: (result: { volumeCm3: number; estimatedPrintTimeMin: number; fileName: string }) => void
  onError: (error: string) => void
}

type ZoneState = 'idle' | 'dragging' | 'loading' | 'success' | 'error'

const STATE_STYLES: Record<ZoneState, string> = {
  idle: 'border-outline-variant text-on-surface-variant hover:border-primary/50 hover:bg-primary/5',
  dragging: 'border-primary bg-primary/5 text-primary',
  loading: 'border-outline-variant text-on-surface-variant',
  success: 'border-green-500/50 bg-green-500/5 text-on-surface',
  error: 'border-error/50 bg-error/5 text-on-surface',
}

export function FileUploadZone({ onParsed, onError }: FileUploadZoneProps) {
  const [state, setState] = useState<ZoneState>('idle')
  const [fileName, setFileName] = useState<string | null>(null)
  const [volume, setVolume] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function processFile(file: File) {
    const validation = validateFileFormat(file.name)
    if (!validation.accepted) {
      setState('error')
      setErrorMsg(validation.error ?? 'Unsupported file format.')
      onError(validation.error ?? 'Unsupported file format.')
      return
    }

    setState('loading')
    setErrorMsg(null)

    try {
      const result = await parseModel(file)
      setState('success')
      setFileName(file.name)
      setVolume(result.volumeCm3)
      onParsed({ ...result, fileName: file.name })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse file.'
      setState('error')
      setErrorMsg(msg)
      onError(msg)
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setState('dragging')
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setState(prev => (prev === 'dragging' ? 'idle' : prev))
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
    else setState('idle')
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  function handleClick() {
    inputRef.current?.click()
  }

  function handleReset() {
    setState('idle')
    setFileName(null)
    setVolume(null)
    setErrorMsg(null)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload 3D model file"
      onClick={handleClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative min-h-[160px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 p-6 cursor-pointer transition-all duration-200 ${STATE_STYLES[state]}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".stl,.obj,.3mf"
        onChange={handleFileChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      {state === 'loading' && (
        <>
          <span className="material-symbols-outlined text-[40px] animate-spin text-primary" aria-hidden="true">
            progress_activity
          </span>
          <p className="text-body-md font-medium">Parsing model…</p>
        </>
      )}

      {state === 'success' && (
        <>
          <span className="material-symbols-outlined text-[40px] text-green-500" aria-hidden="true">
            check_circle
          </span>
          <div className="text-center">
            <p className="text-body-md font-medium text-on-surface truncate max-w-[240px]">{fileName}</p>
            <p className="text-label-md text-on-surface-variant mt-0.5">
              Volume: {volume?.toFixed(2)} cm³
            </p>
          </div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); handleReset() }}
            className="text-label-sm text-primary hover:underline mt-1"
          >
            Upload different file
          </button>
        </>
      )}

      {state === 'error' && (
        <>
          <span className="material-symbols-outlined text-[40px] text-error" aria-hidden="true">
            error
          </span>
          <div className="text-center">
            <p className="text-body-md font-medium text-error">Parse failed</p>
            <p className="text-label-sm text-on-surface-variant mt-1 max-w-[280px]">{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); handleReset() }}
            className="text-label-sm text-primary hover:underline mt-1"
          >
            Try again
          </button>
        </>
      )}

      {(state === 'idle' || state === 'dragging') && (
        <>
          <span
            className={`material-symbols-outlined text-[40px] transition-colors ${state === 'dragging' ? 'text-primary' : 'text-on-surface-variant'}`}
            aria-hidden="true"
          >
            upload_file
          </span>
          <div className="text-center">
            <p className="text-body-md font-medium">
              {state === 'dragging' ? 'Drop to upload' : 'Drag & drop or click to browse'}
            </p>
            <p className="text-label-sm text-on-surface-variant mt-1">
              Supported formats: .stl, .obj, .3mf
            </p>
          </div>
        </>
      )}
    </div>
  )
}
