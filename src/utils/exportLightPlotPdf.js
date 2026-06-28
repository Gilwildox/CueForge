// Exportación PDF del Light Plot — fondo CLARO para impresión
// Los símbolos se invierten: trazo negro sobre fondo blanco.
// El canvas SVG se regenera con colores invertidos antes de rasterizar.
import { jsPDF } from 'jspdf'
import {
  SIMBOLOS_MAP,
  TIPO_A_SIMBOLO,
  resolverColorLuminaria,
  COLOR_DEFAULT,
} from './lightPlotSymbols.jsx'

const CANVAS_W = 1200
const CANVAS_H = 850

// Colores PDF (fondo claro)
const COLOR_NARANJA = [254, 103, 50]
const COLOR_GRIS    = [100, 100, 100]
const COLOR_NEGRO   = [20, 20, 20]

// ---------------------------------------------------------------------------
// Serializa una prop de React a atributo SVG (camelCase → kebab-case)
// ---------------------------------------------------------------------------
const propToAttr = (k, v) => {
  const attr = k
    .replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`)
    .replace(/^class-name$/, 'class')
    .replace(/^stroke-linecap$/, 'stroke-linecap')
    .replace(/^stroke-linejoin$/, 'stroke-linejoin')
    .replace(/^stroke-dasharray$/, 'stroke-dasharray')
    .replace(/^font-size$/, 'font-size')
    .replace(/^font-family$/, 'font-family')
    .replace(/^text-anchor$/, 'text-anchor')
  return `${attr}="${v}"`
}

const serializarJSX = (el) => {
  if (!el) return ''
  if (typeof el === 'string' || typeof el === 'number') return String(el)
  if (Array.isArray(el)) return el.map(serializarJSX).join('')
  const { type, props } = el
  if (!type) return ''
  const { children, key, ref, ...attrs } = props ?? {}
  const attrStr = Object.entries(attrs)
    .filter(([k]) => k !== 'style')
    .map(([k, v]) => propToAttr(k, v))
    .join(' ')
  const child = children ? serializarJSX(children) : ''
  const VOID  = ['circle', 'rect', 'line', 'path', 'ellipse', 'polygon']
  if (VOID.includes(type)) return `<${type} ${attrStr}/>`
  return `<${type} ${attrStr}>${child}</${type}>`
}

const simboloSvgStr = (tipo, fill, stroke) => {
  const Comp = SIMBOLOS_MAP[tipo] ?? SIMBOLOS_MAP.generico
  return serializarJSX(Comp({ fill, stroke }))
}

// ---------------------------------------------------------------------------
// generarSvgDesdeProject — SVG con colores para IMPRESIÓN (fondo blanco)
// fill de símbolo = color de mica si existe, sino blanco (#f8f8f8 suave)
// stroke de símbolo = negro (#1a1a1a)
// ---------------------------------------------------------------------------
export const generarSvgDesdeProject = (project) => {
  const lightPlot  = project.lightPlot ?? {}
  const luminarias = project.luminarias ?? []
  const instancias = lightPlot.instancias ?? []
  const elementos  = lightPlot.elementos  ?? []

  const STROKE_PDF = '#1a1a1a'
  const FILL_SIM   = '#f0f0f0'  // fill neutro si no hay color de mica

  // Elementos estructurales
  const elemsStr = elementos.map((elem) => {
    const color  = elem.color && elem.color !== '#94a3b8' ? elem.color : '#333333'
    const grosor = elem.grosor ?? 2
    if (elem.tipo === 'line') {
      return `<line x1="${elem.x1}" y1="${elem.y1}" x2="${elem.x2}" y2="${elem.y2}" stroke="${color}" stroke-width="${grosor}"/>`
    }
    if (elem.tipo === 'vara') {
      const dx  = (elem.x2 ?? elem.x1) - elem.x1
      const dy  = (elem.y2 ?? elem.y1) - elem.y1
      const len = Math.sqrt(dx*dx + dy*dy) || 1
      const nx  = -dy/len, ny = dx/len, t = 10
      return `
        <line x1="${elem.x1}" y1="${elem.y1}" x2="${elem.x2}" y2="${elem.y2}" stroke="${color}" stroke-width="${grosor+2}"/>
        <line x1="${elem.x1+nx*t}" y1="${elem.y1+ny*t}" x2="${elem.x1-nx*t}" y2="${elem.y1-ny*t}" stroke="${color}" stroke-width="${grosor}"/>
        <line x1="${elem.x2+nx*t}" y1="${elem.y2+ny*t}" x2="${elem.x2-nx*t}" y2="${elem.y2-ny*t}" stroke="${color}" stroke-width="${grosor}"/>
      `
    }
    if (elem.tipo === 'rect') {
      const x = Math.min(elem.x1, elem.x2 ?? elem.x1)
      const y = Math.min(elem.y1, elem.y2 ?? elem.y1)
      return `<rect x="${x}" y="${y}" width="${Math.abs((elem.x2??elem.x1)-elem.x1)}" height="${Math.abs((elem.y2??elem.y1)-elem.y1)}" fill="none" stroke="${color}" stroke-width="${grosor}"/>`
    }
    if (elem.tipo === 'text') {
      const fs = grosor ? grosor * 4 + 10 : 14
      return `<text x="${elem.x1}" y="${elem.y1}" fill="${color}" font-size="${fs}" font-family="sans-serif">${elem.texto}</text>`
    }
    return ''
  }).join('\n')

  // Instancias de luminaria — trazo negro, fill = color de mica o neutro claro
  const instStr = instancias.map((inst) => {
    const lum    = luminarias.find((l) => l.id === inst.lumId)
    // Si la luminaria tiene color fijo, se usa ese color en el PDF también
    const fill   = (lum && lum.tipoColor === 'fijo' && lum.colorFijo?.hex)
      ? lum.colorFijo.hex
      : FILL_SIM
    const escala = inst.escala ?? 1
    const simStr = simboloSvgStr(inst.simbolo, fill, STROKE_PDF)
    const etiq   = (inst.canal !== '' && inst.canal != null)
      ? `<text y="${32*escala}" text-anchor="middle" font-size="12" font-family="sans-serif" fill="${STROKE_PDF}">${inst.canal}</text>`
      : ''
    return `
      <g transform="translate(${inst.x},${inst.y}) rotate(${inst.rotacion ?? 0})">
        <g transform="scale(${escala})">${simStr}</g>
        ${etiq}
      </g>`
  }).join('\n')

  // Imagen de fondo (se mantiene si existe)
  const fondoStr = lightPlot.imagenFondo
    ? `<image href="${lightPlot.imagenFondo}" x="0" y="0" width="${CANVAS_W}" height="${CANVAS_H}" opacity="0.5" preserveAspectRatio="xMidYMid meet"/>`
    : ''

  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">
    <!-- Fondo blanco para impresión -->
    <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="#ffffff"/>
    <!-- Grid muy suave -->
    <defs>
      <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" stroke-width="0.5"/>
      </pattern>
    </defs>
    <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#grid)"/>
    ${fondoStr}
    <g id="draw-layer">${elemsStr}</g>
    <g id="sym-layer">${instStr}</g>
  </svg>`

  const div = document.createElement('div')
  div.innerHTML = svgStr
  return div.querySelector('svg')
}

// ---------------------------------------------------------------------------
// svgAImagenPng — rasteriza el SVG a PNG via canvas offscreen
// ---------------------------------------------------------------------------
const svgAImagenPng = (svgElement) =>
  new Promise((resolve, reject) => {
    const clone = svgElement.cloneNode(true)
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.setAttribute('width',  CANVAS_W)
    clone.setAttribute('height', CANVAS_H)

    const blob = new Blob([new XMLSerializer().serializeToString(clone)],
      { type: 'image/svg+xml;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const img  = new Image()

    img.onload = () => {
      const canvas  = document.createElement('canvas')
      canvas.width  = CANVAS_W
      canvas.height = CANVAS_H
      const ctx     = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = (err) => { URL.revokeObjectURL(url); reject(err) }
    img.src = url
  })

// ---------------------------------------------------------------------------
// exportarLightPlotPDF
// ---------------------------------------------------------------------------
export const exportarLightPlotPDF = async (project, svgElement) => {
  const meta = project.metadatos ?? {}
  const png  = await svgAImagenPng(svgElement)

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })
  const PW  = 279, PH = 216, M = 12
  const ALTO_HEADER = 20

  // --- Encabezado claro ---
  // Fondo blanco con línea inferior naranja
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, PW, ALTO_HEADER, 'F')
  doc.setFillColor(...COLOR_NARANJA)
  doc.rect(0, ALTO_HEADER - 1, PW, 1.2, 'F')

  // Nombre de la obra
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...COLOR_NEGRO)
  doc.text(meta.nombreObra || 'Sin título', M, 9)

  // Créditos
  const lineaMeta = [
    meta.disenoIluminacion && `D.I.: ${meta.disenoIluminacion}`,
    meta.direccion          && `Dir.: ${meta.direccion}`,
    meta.produccion         && `Prod.: ${meta.produccion}`,
  ].filter(Boolean).join('   ·   ')

  if (lineaMeta) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COLOR_GRIS)
    doc.text(lineaMeta, M, 15.5)
  }

  // Etiqueta derecha
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...COLOR_NARANJA)
  doc.text('PLANO DE ILUMINACIÓN', PW - M, 9, { align: 'right' })

  const hoy = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...COLOR_GRIS)
  doc.text(hoy, PW - M, 15.5, { align: 'right' })

  // --- Imagen del plano ---
  const ALTO_PIE = 8
  const yCanvas  = ALTO_HEADER + 1.5
  const hCanvas  = PH - ALTO_HEADER - ALTO_PIE - 3
  const wCanvas  = PW - M * 2

  const ratioSvg = CANVAS_W / CANVAS_H
  const ratioBox = wCanvas / hCanvas
  let imgW, imgH, imgX, imgY

  if (ratioSvg > ratioBox) {
    imgW = wCanvas; imgH = wCanvas / ratioSvg
    imgX = M;       imgY = yCanvas + (hCanvas - imgH) / 2
  } else {
    imgH = hCanvas; imgW = hCanvas * ratioSvg
    imgX = M + (wCanvas - imgW) / 2; imgY = yCanvas
  }

  doc.addImage(png, 'PNG', imgX, imgY, imgW, imgH)

  // Borde del plano
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.rect(imgX, imgY, imgW, imgH)

  // --- Pie de página claro ---
  const yPie = PH - 3
  doc.setFillColor(248, 248, 248)
  doc.rect(0, PH - ALTO_PIE, PW, ALTO_PIE, 'F')
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(0, PH - ALTO_PIE, PW, PH - ALTO_PIE)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(...COLOR_GRIS)
  doc.text('Generado con CueForge', M, yPie)

  const total = project.lightPlot?.instancias?.length ?? 0
  if (total > 0) {
    doc.text(`${total} luminaria${total !== 1 ? 's' : ''} en el plano`, PW / 2, yPie, { align: 'center' })
  }
  if (meta.responsableTecnico) {
    doc.text(`R. Técnico: ${meta.responsableTecnico}`, PW - M, yPie, { align: 'right' })
  }

  doc.save(`${meta.nombreObra || 'proyecto'} - Plano de iluminacion.pdf`)
}
