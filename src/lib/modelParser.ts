// Model file parser — extracts volume (cm³) and estimates print time

import * as THREE from 'three'

// Throughput constant: cm³ per minute (approximate for FDM at 0.2mm layer height)
const LAYER_VOLUME_CM3_PER_MINUTE = 0.8

const SUPPORTED_EXTENSIONS = ['stl', 'obj', '3mf'] as const

export function validateFileFormat(filename: string): { accepted: boolean; error?: string } {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  if ((SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)) {
    return { accepted: true }
  }
  return {
    accepted: false,
    error: `Unsupported format: .${ext}. Please upload a .stl, .obj, or .3mf file.`,
  }
}

/**
 * Signed volume algorithm (divergence theorem) for a triangle mesh.
 * Returns volume in cm³ (assumes geometry units are mm, divides by 1000).
 */
export function signedVolumeOfMesh(geometry: THREE.BufferGeometry): number {
  const position = geometry.getAttribute('position')
  if (!position) return 0

  const geo = geometry.index ? geometry.toNonIndexed() : geometry
  const pos = geo.getAttribute('position')
  let volume = 0

  for (let i = 0; i < pos.count; i += 3) {
    const ax = pos.getX(i),   ay = pos.getY(i),   az = pos.getZ(i)
    const bx = pos.getX(i+1), by = pos.getY(i+1), bz = pos.getZ(i+1)
    const cx = pos.getX(i+2), cy = pos.getY(i+2), cz = pos.getZ(i+2)
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6
  }

  return Math.abs(volume) / 1000 // mm³ → cm³
}

// ─── 3MF parser (ZIP + XML, no Three.js loader) ──────────────────────────────

/**
 * Reads a 3MF file (ZIP archive) and extracts all triangle vertices.
 * Returns total volume in cm³ using the signed-volume algorithm.
 *
 * 3MF structure:
 *   /3D/3dmodel.model  ← XML with <mesh><vertices><triangles>
 */
async function parse3MF(arrayBuffer: ArrayBuffer): Promise<number> {
  // Use fflate (bundled with Three.js) or manual ZIP parsing
  // We'll use a manual approach: find the 3dmodel.model file in the ZIP
  const bytes = new Uint8Array(arrayBuffer)

  // Find all local file headers in the ZIP (signature: PK\x03\x04)
  const files: { name: string; data: Uint8Array }[] = []

  let offset = 0
  while (offset < bytes.length - 4) {
    // Local file header signature
    if (bytes[offset] === 0x50 && bytes[offset+1] === 0x4B &&
        bytes[offset+2] === 0x03 && bytes[offset+3] === 0x04) {

      const compressionMethod = bytes[offset+8] | (bytes[offset+9] << 8)
      const compressedSize = bytes[offset+18] | (bytes[offset+19] << 8) |
                             (bytes[offset+20] << 16) | (bytes[offset+21] << 24)
      const uncompressedSize = bytes[offset+22] | (bytes[offset+23] << 8) |
                               (bytes[offset+24] << 16) | (bytes[offset+25] << 24)
      const fileNameLength = bytes[offset+26] | (bytes[offset+27] << 8)
      const extraFieldLength = bytes[offset+28] | (bytes[offset+29] << 8)

      const fileNameBytes = bytes.slice(offset+30, offset+30+fileNameLength)
      const fileName = new TextDecoder().decode(fileNameBytes)

      const dataOffset = offset + 30 + fileNameLength + extraFieldLength
      const compressedData = bytes.slice(dataOffset, dataOffset + compressedSize)

      let fileData: Uint8Array
      if (compressionMethod === 0) {
        // Stored (no compression)
        fileData = compressedData
      } else if (compressionMethod === 8) {
        // Deflate
        try {
          const ds = new DecompressionStream('deflate-raw')
          const writer = ds.writable.getWriter()
          const reader = ds.readable.getReader()
          writer.write(compressedData)
          writer.close()

          const chunks: Uint8Array[] = []
          let done = false
          while (!done) {
            const result = await reader.read()
            if (result.done) { done = true } else { chunks.push(result.value) }
          }

          const total = chunks.reduce((sum, c) => sum + c.length, 0)
          fileData = new Uint8Array(total)
          let pos = 0
          for (const chunk of chunks) { fileData.set(chunk, pos); pos += chunk.length }
        } catch {
          fileData = new Uint8Array(0)
        }
      } else {
        fileData = new Uint8Array(0)
      }

      files.push({ name: fileName, data: fileData })
      offset = dataOffset + compressedSize
    } else {
      offset++
    }
  }

  // Find the 3D model XML file
  const modelFile = files.find(f =>
    f.name.toLowerCase().includes('3dmodel.model') ||
    f.name.toLowerCase().endsWith('.model')
  )

  if (!modelFile || modelFile.data.length === 0) {
    throw new Error('Could not find 3D model data in the .3mf file.')
  }

  const xmlText = new TextDecoder().decode(modelFile.data)
  return parse3MFXml(xmlText)
}

function parse3MFXml(xmlText: string): number {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')

  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new Error('Could not parse the 3MF XML structure.')

  // Collect all vertices and triangles across all meshes
  let totalVolume = 0

  const meshes = doc.querySelectorAll('mesh')
  if (meshes.length === 0) throw new Error('No mesh data found in the .3mf file.')

  for (const mesh of meshes) {
    const vertexNodes = mesh.querySelectorAll('vertices vertex')
    const triangleNodes = mesh.querySelectorAll('triangles triangle')

    if (vertexNodes.length === 0 || triangleNodes.length === 0) continue

    // Build vertex array
    const verts: number[] = []
    for (const v of vertexNodes) {
      verts.push(
        parseFloat(v.getAttribute('x') ?? '0'),
        parseFloat(v.getAttribute('y') ?? '0'),
        parseFloat(v.getAttribute('z') ?? '0'),
      )
    }

    // Calculate signed volume from triangles
    let volume = 0
    for (const tri of triangleNodes) {
      const i1 = parseInt(tri.getAttribute('v1') ?? '0') * 3
      const i2 = parseInt(tri.getAttribute('v2') ?? '0') * 3
      const i3 = parseInt(tri.getAttribute('v3') ?? '0') * 3

      const ax = verts[i1], ay = verts[i1+1], az = verts[i1+2]
      const bx = verts[i2], by = verts[i2+1], bz = verts[i2+2]
      const cx = verts[i3], cy = verts[i3+1], cz = verts[i3+2]

      volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6
    }

    totalVolume += Math.abs(volume)
  }

  // 3MF units are mm by default → convert mm³ to cm³
  return totalVolume / 1000
}

// ─── Main parse function ──────────────────────────────────────────────────────

export async function parseModel(
  file: File
): Promise<{ volumeCm3: number; estimatedPrintTimeMin: number }> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const validation = validateFileFormat(file.name)
  if (!validation.accepted) throw new Error(validation.error)

  const arrayBuffer = await file.arrayBuffer()
  let volumeCm3 = 0

  if (ext === 'stl') {
    const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js')
    const loader = new STLLoader()
    const geometry = loader.parse(arrayBuffer)
    volumeCm3 = signedVolumeOfMesh(geometry)

  } else if (ext === 'obj') {
    const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js')
    const loader = new OBJLoader()
    const text = new TextDecoder().decode(arrayBuffer)
    const group = loader.parse(text)
    const geometries: THREE.BufferGeometry[] = []
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        geometries.push((child as THREE.Mesh).geometry)
      }
    })
    if (geometries.length === 0) {
      throw new Error('Could not parse this file. Please check it is a valid 3D model and try again.')
    }
    // Sum volumes of all meshes
    for (const geo of geometries) {
      volumeCm3 += signedVolumeOfMesh(geo)
    }

  } else if (ext === '3mf') {
    // Use our custom ZIP+XML parser — much more reliable than ThreeMFLoader
    volumeCm3 = await parse3MF(arrayBuffer)
  }

  if (volumeCm3 <= 0) {
    throw new Error('Volume could not be determined. The model may be empty or non-manifold.')
  }

  const estimatedPrintTimeMin = volumeCm3 / LAYER_VOLUME_CM3_PER_MINUTE

  return { volumeCm3, estimatedPrintTimeMin }
}
