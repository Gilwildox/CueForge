// Exportación PDF del Light Plot — fondo CLARO para impresión
// Los símbolos se invierten: trazo negro sobre fondo blanco.
// El canvas SVG se regenera con colores invertidos antes de rasterizar.
import { jsPDF } from 'jspdf'
import {
  SIMBOLOS_MAP,
  SIMBOLOS_DISPONIBLES,
  TIPO_A_SIMBOLO,
  resolverColorLuminaria,
  COLOR_DEFAULT,
} from './lightPlotSymbols.jsx'

const CANVAS_W = 1200
const CANVAS_H = 850

// Convierte un color hex (#rrggbb) a [r,g,b] para los métodos de color de jsPDF
const hexARgb = (hex) => {
  const limpio = (hex || '#cccccc').replace('#', '')
  const valido = /^[0-9a-fA-F]{6}$/.test(limpio) ? limpio : 'cccccc'
  return [
    parseInt(valido.slice(0, 2), 16),
    parseInt(valido.slice(2, 4), 16),
    parseInt(valido.slice(4, 6), 16),
  ]
}

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
// construirLeyenda — agrupa las instancias colocadas en el plano por símbolo,
// cuenta cuántas hay de cada uno y resuelve el color/label para dibujarlas.
// Solo incluye símbolos que realmente están en el plano (no el catálogo completo).
// ---------------------------------------------------------------------------
const construirLeyenda = (project) => {
  const lightPlot  = project.lightPlot ?? {}
  const luminarias = project.luminarias ?? []
  const instancias = lightPlot.instancias ?? []

  const grupos = {} // { claveSimbolo: { count, label, fill } }

  instancias.forEach((inst) => {
    const lum = luminarias.find((l) => l.id === inst.lumId)
    if (!grupos[inst.simbolo]) {
      const labelDef = SIMBOLOS_DISPONIBLES.find((s) => s.key === inst.simbolo)
      const fill = lum
        ? resolverColorLuminaria(lum, lightPlot, inst)
        : '#f0f0f0'
      grupos[inst.simbolo] = { count: 0, label: labelDef?.label ?? inst.simbolo, fill }
    }
    grupos[inst.simbolo].count += 1
  })

  return Object.entries(grupos)
    .map(([clave, datos]) => ({ clave, ...datos }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
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

  // Instancias de luminaria — trazo negro, fill resuelto con la misma
  // prioridad que en pantalla (fijo > colorOverride/typeDefaults > neutro)
  const instStr = instancias.map((inst) => {
    const lum  = luminarias.find((l) => l.id === inst.lumId)
    const fill = lum ? resolverColorLuminaria(lum, lightPlot, inst) : FILL_SIM
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
// incluirListado=true reserva una columna lateral derecha con la leyenda de
// símbolos usados en el plano (agrupados, con cantidad). El plano se reduce
// proporcionalmente para no empalmarse con esa columna.
// ---------------------------------------------------------------------------
export const exportarLightPlotPDF = async (project, svgElement, incluirListado = false) => {
  const meta = project.metadatos ?? {}
  const png  = await svgAImagenPng(svgElement)
  const leyenda = incluirListado ? construirLeyenda(project) : []

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

  // Columna de leyenda: ancho fijo, separado del plano por un margen propio.
  // Si no hay listado o no hay símbolos que mostrar, el plano usa todo el ancho.
  const ANCHO_LEYENDA = 52
  const hayLeyenda = incluirListado && leyenda.length > 0
  const wCanvas = hayLeyenda
    ? (PW - M * 2 - ANCHO_LEYENDA - M)
    : (PW - M * 2)

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

  // --- Columna de leyenda ---
  if (hayLeyenda) {
    const xLey = PW - M - ANCHO_LEYENDA
    const yLeyTope = yCanvas

    doc.setDrawColor(210, 210, 210)
    doc.setLineWidth(0.3)
    doc.line(xLey - M / 2, yLeyTope, xLey - M / 2, yLeyTope + hCanvas)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...COLOR_NEGRO)
    doc.text('SIMBOLOGÍA', xLey, yLeyTope + 3)

    let yLey = yLeyTope + 9
    const ALTO_FILA = 9
    const filasMax = Math.floor((hCanvas - 9) / ALTO_FILA)

    leyenda.slice(0, filasMax).forEach((item) => {
      // Círculo de color como referencia visual rápida
      const [r, g, b] = hexARgb(item.fill)
      doc.setFillColor(r, g, b)
      doc.setDrawColor(...COLOR_NEGRO)
      doc.setLineWidth(0.25)
      doc.circle(xLey + 2, yLey, 1.8, 'FD')

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...COLOR_NEGRO)
      doc.text(item.label, xLey + 6, yLey + 0.9)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLOR_GRIS)
      doc.text(`× ${item.count}`, xLey + ANCHO_LEYENDA - 1, yLey + 0.9, { align: 'right' })

      yLey += ALTO_FILA
    })

    if (leyenda.length > filasMax) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(6.5)
      doc.setTextColor(...COLOR_GRIS)
      doc.text(`+ ${leyenda.length - filasMax} símbolo(s) más`, xLey, yLey + 2)
    }
  }

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