// Módulo 8 — Exportación a PDF
// Genera los reportes en PDF: Luminarias, Ficha técnica, Presupuesto,
// Guion de iluminación (versión A: solo luz, versión B: completa)
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { calcularDeltas } from './helpers'

// ---------------------------------------------------------------------------
// Marca — cambiar aquí cuando se confirme el rebrand a CueForge
// ---------------------------------------------------------------------------
const APP_NAME = 'CueForge'
const FOOTER_TEXT = `Generado por ${APP_NAME}`

// ---------------------------------------------------------------------------
// Helpers comunes
// ---------------------------------------------------------------------------

// Dibuja el encabezado de metadatos del proyecto en la página actual.
// infoFuncion = { venue, fecha } — campos libres no persistidos en el proyecto
const dibujarEncabezado = (doc, titulo, project, infoFuncion, anchoUtil) => {
  const meta = project.metadatos ?? {}
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(20, 20, 20)
  doc.text(meta.nombreObra || 'Sin título', 40, 40)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text(titulo, 40, 56)

  // Columna derecha: créditos
  const lineasCreditos = []
  if (meta.direccion) lineasCreditos.push(`Dirección: ${meta.direccion}`)
  if (meta.produccion) lineasCreditos.push(`Producción: ${meta.produccion}`)
  if (meta.disenoIluminacion) lineasCreditos.push(`Diseño de iluminación: ${meta.disenoIluminacion}`)
  if (infoFuncion?.venue) lineasCreditos.push(`Venue: ${infoFuncion.venue}`)
  if (infoFuncion?.fecha) lineasCreditos.push(`Fecha de función: ${infoFuncion.fecha}`)

  doc.setFontSize(8)
  let y = 36
  lineasCreditos.forEach((linea) => {
    doc.text(linea, 40 + anchoUtil, y, { align: 'right' })
    y += 11
  })

  // Línea separadora
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.5)
  doc.line(40, 66, 40 + anchoUtil, 66)

  return 80 // posición Y donde puede iniciar el contenido
}

// Pie de página con marca y número de página — se aplica a todas las páginas al final
const aplicarPiePagina = (doc) => {
  const totalPaginas = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    const alto = doc.internal.pageSize.getHeight()
    const ancho = doc.internal.pageSize.getWidth()
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(FOOTER_TEXT, 40, alto - 20)
    doc.text(`Página ${i} de ${totalPaginas}`, ancho - 40, alto - 20, { align: 'right' })
  }
}

// Construye el texto de cambios de una escena, igual formato que FilaEscena
// en SceneManager.jsx: "1.- 50% · Azul  3.- 75%  Vara 1.- 100%"
// Nota: se omiten los emojis (🎨/⤢) porque jsPDF con fuentes estándar no
// los renderiza de forma confiable; se usan prefijos de texto en su lugar.
const construirTextoCambios = (escenas, indice, luminarias, biblioteca) => {
  const deltas = calcularDeltas(escenas, indice)
  const escena = escenas[indice]
  if (escena.todoACero) return 'Todo a 0 (blackout)'
  if (deltas.length === 0) return '—'

  const lumsMap = Object.fromEntries(luminarias.map((l) => [l.id, l]))
  const deltasPorLum = {}
  deltas.forEach((d) => {
    if (!deltasPorLum[d.lumId]) deltasPorLum[d.lumId] = {}
    deltasPorLum[d.lumId][d.campo] = d
  })

  const lumsConCambio = Object.keys(deltasPorLum)
    .map((lumId) => lumsMap[lumId])
    .filter(Boolean)
    .sort((a, b) => Number(a.numero) - Number(b.numero))

  // Agrupación: mismo criterio que FilaEscena — colapsa grupo si todos los
  // miembros con cambio comparten el mismo delta
  const gruposMap = {}
  luminarias.forEach((lum) => {
    if (lum.grupoId) {
      if (!gruposMap[lum.grupoId]) gruposMap[lum.grupoId] = { nombre: lum.nombreGrupo, miembros: [] }
      gruposMap[lum.grupoId].miembros.push(lum.id)
    }
  })

  const partesLinea = (cambios) => {
    const partes = []
    if (cambios.intensidad) partes.push(`${cambios.intensidad.nuevo}%`)
    if (cambios.color) {
      const nombre = cambios.color.nuevo
        ? biblioteca.colores.find((c) => c.id === cambios.color.nuevo)?.nombre ?? '?'
        : '—'
      partes.push(nombre)
    }
    if (cambios.posicion) {
      const nombre = cambios.posicion.nuevo
        ? biblioteca.posiciones.find((p) => p.id === cambios.posicion.nuevo)?.nombre ?? '?'
        : '—'
      partes.push(nombre)
    }
    return partes.join(' · ')
  }

  const lineas = []
  const lumsYaMostradas = new Set()

  for (const [grupoId, grupo] of Object.entries(gruposMap)) {
    const miembrosConCambio = grupo.miembros.filter((id) => deltasPorLum[id])
    if (miembrosConCambio.length === 0) continue

    const todosIgual = miembrosConCambio.every((id) => {
      const d = deltasPorLum[id]
      const ref = deltasPorLum[miembrosConCambio[0]]
      return (
        (d.intensidad?.nuevo ?? null) === (ref.intensidad?.nuevo ?? null) &&
        (d.color?.nuevo ?? null) === (ref.color?.nuevo ?? null) &&
        (d.posicion?.nuevo ?? null) === (ref.posicion?.nuevo ?? null)
      )
    })

    if (todosIgual && miembrosConCambio.length > 1) {
      lineas.push(`${grupo.nombre}.- ${partesLinea(deltasPorLum[miembrosConCambio[0]])}`)
      miembrosConCambio.forEach((id) => lumsYaMostradas.add(id))
    }
  }

  lumsConCambio.forEach((lum) => {
    if (lumsYaMostradas.has(lum.id)) return
    lineas.push(`${lum.numero}.- ${partesLinea(deltasPorLum[lum.id])}`)
  })

  return lineas.join('  ')
}

// ---------------------------------------------------------------------------
// Reporte: Lista de luminarias
// ---------------------------------------------------------------------------
export const exportarLuminariasPdf = (project, infoFuncion = {}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  const anchoUtil = doc.internal.pageSize.getWidth() - 80
  const yInicio = dibujarEncabezado(doc, 'Lista de luminarias', project, infoFuncion, anchoUtil)

  const luminarias = project.luminarias ?? []
  const gobos = project.biblioteca?.gobos ?? []
  const ordenadas = [...luminarias].sort((a, b) => Number(a.numero) - Number(b.numero))

  const filas = ordenadas.map((lum) => {
    const gobo = gobos.find((g) => g.id === lum.gobo_id)
    let color = '—'
    if (lum.tipoColor === 'fijo') color = lum.colorFijo?.nombre || lum.colorFijo?.hex || '—'
    if (lum.tipoColor === 'variable') color = 'Variable'

    return [
      lum.numero,
      lum.nombre || '—',
      lum.nombreGrupo || '—',
      `${lum.tipo || '—'}${lum.esRobotica ? ' (rob.)' : ''}`,
      lum.posicion || '—',
      color,
      lum.afoque || '—',
      gobo?.nombre || '—',
      lum.notas || '—',
    ]
  })

  autoTable(doc, {
    startY: yInicio,
    margin: { left: 40, right: 40 },
    head: [['#', 'Nombre', 'Grupo', 'Tipo', 'Posición', 'Color', 'Afoque', 'Gobo', 'Notas']],
    body: filas,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [40, 40, 40], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  })

  aplicarPiePagina(doc)
  doc.save(`${project.metadatos?.nombreObra || 'proyecto'} - Luminarias.pdf`)
}

// ---------------------------------------------------------------------------
// Reporte: Ficha técnica
// ---------------------------------------------------------------------------
export const exportarFichaTecnicaPdf = (project, infoFuncion = {}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  const anchoUtil = doc.internal.pageSize.getWidth() - 80
  let y = dibujarEncabezado(doc, 'Ficha técnica / Requerimientos del espacio', project, infoFuncion, anchoUtil)

  const ft = project.fichaTecnica ?? {}

  // Secciones en el mismo orden que TechnicalSheet.jsx
  const secciones = [
    {
      titulo: '1. Espacio escénico',
      campos: [
        ['Tipo de escenario requerido', ft.tipoEscenario],
        ['Ancho mínimo', ft.anchoMinimo],
        ['Fondo mínimo', ft.fondoMinimo],
        ['Alto útil mínimo', ft.altoMinimo],
        ['Piso requerido', ft.pisoRequerido],
        ['Drapería indispensable y cantidad', ft.draperia],
        ['Varas necesarias', ft.varas],
      ],
    },
    {
      titulo: '2. Infraestructura eléctrica',
      campos: [
        ['Circuitos regulados mínimos', ft.circuitosMinimos],
        ['Potencia requerida', ft.potenciaRequerida],
        ['Consola de iluminación', ft.consola],
      ],
    },
    {
      titulo: '3. Requerimientos técnicos especiales',
      campos: [
        ['Followspots requeridos', ft.followspots],
        ['Hazer / máquina de humo', ft.hazer],
        ['Necesidades especiales', ft.necesidadesEspeciales],
      ],
    },
    {
      titulo: '4. Operación y montaje',
      campos: [
        ['Tiempo de montaje', ft.tiempoMontaje],
        ['Tiempo de enfoque', ft.tiempoEnfoque],
        ['Tiempo de programación', ft.tiempoProgramacion],
        ['Tiempo de ensayo', ft.tiempoEnsayo],
        ['Tiempo de desmontaje', ft.tiempoDesmontaje],
        ['Personal local requerido', ft.personalLocal],
      ],
    },
    {
      titulo: '5. Seguridad y observaciones',
      campos: [
        ['Requisitos de seguridad', ft.requisitosSeguidad],
        ['Restricciones críticas', ft.restriccionesCriticas],
        ['Notas generales', ft.notas],
      ],
    },
  ]

  const altoPagina = doc.internal.pageSize.getHeight()

  secciones.forEach((seccion) => {
    // Salto de página si no cabe el título + al menos una fila
    if (y > altoPagina - 80) { doc.addPage(); y = 40 }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(180, 120, 20)
    doc.text(seccion.titulo.toUpperCase(), 40, y)
    y += 6
    doc.setDrawColor(220, 220, 220)
    doc.line(40, y, 40 + anchoUtil, y)
    y += 14

    const filas = seccion.campos
      .filter(([, valor]) => valor && String(valor).trim())
      .map(([etiqueta, valor]) => [etiqueta, valor])

    if (filas.length === 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(150, 150, 150)
      doc.text('Sin información registrada.', 40, y)
      y += 20
      return
    }

    autoTable(doc, {
      startY: y,
      margin: { left: 40, right: 40 },
      body: filas,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 0, right: 8 } },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [80, 80, 80], cellWidth: 170 },
        1: { textColor: [20, 20, 20] },
      },
    })
    y = doc.lastAutoTable.finalY + 18
  })

  // Campos extra (si existen)
  const extras = (ft.camposExtra ?? []).filter((c) => c.etiqueta?.trim())
  if (extras.length > 0) {
    if (y > altoPagina - 80) { doc.addPage(); y = 40 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(180, 120, 20)
    doc.text('CAMPOS ADICIONALES', 40, y)
    y += 6
    doc.line(40, y, 40 + anchoUtil, y)
    y += 14
    autoTable(doc, {
      startY: y,
      margin: { left: 40, right: 40 },
      body: extras.map((c) => [c.etiqueta, c.valor || '—']),
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 0, right: 8 } },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [80, 80, 80], cellWidth: 170 },
        1: { textColor: [20, 20, 20] },
      },
    })
  }

  aplicarPiePagina(doc)
  doc.save(`${project.metadatos?.nombreObra || 'proyecto'} - Ficha tecnica.pdf`)
}

// ---------------------------------------------------------------------------
// Reporte: Presupuesto
// ---------------------------------------------------------------------------
const ETIQUETAS_ORIGEN = { sinCosto: 'Provisto sin costo', renta: 'Renta', compra: 'Compra' }

const formatoMonedaPdf = (n) =>
  n === null || n === undefined || n === '' ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

export const exportarPresupuestoPdf = (project, infoFuncion = {}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  const anchoUtil = doc.internal.pageSize.getWidth() - 80
  const yInicio = dibujarEncabezado(doc, 'Presupuesto', project, infoFuncion, anchoUtil)

  const items = project.presupuesto ?? []
  const totalRenta = items.filter((i) => i.origen === 'renta').reduce((s, i) => s + (i.costo || 0), 0)
  const totalCompra = items.filter((i) => i.origen === 'compra').reduce((s, i) => s + (i.costo || 0), 0)

  const filas = items.map((item) => [
    item.cantidad,
    item.equipo,
    [item.marca, item.modelo].filter(Boolean).join(' / ') || '—',
    ETIQUETAS_ORIGEN[item.origen] ?? item.origen,
    item.proveedor || '—',
    item.contacto || '—',
    item.origen === 'sinCosto' ? '—' : formatoMonedaPdf(item.costo),
  ])

  autoTable(doc, {
    startY: yInicio,
    margin: { left: 40, right: 40 },
    head: [['Cant.', 'Equipo', 'Marca / Modelo', 'Origen', 'Proveedor', 'Contacto', 'Costo']],
    body: filas,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [40, 40, 40], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: { 6: { halign: 'right' } },
  })

  let y = doc.lastAutoTable.finalY + 20
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(20, 20, 20)
  doc.text(`Total renta: ${formatoMonedaPdf(totalRenta)}`, 40 + anchoUtil, y, { align: 'right' })
  y += 14
  doc.text(`Total compra: ${formatoMonedaPdf(totalCompra)}`, 40 + anchoUtil, y, { align: 'right' })
  y += 14
  doc.setTextColor(180, 120, 20)
  doc.text(`Total general: ${formatoMonedaPdf(totalRenta + totalCompra)}`, 40 + anchoUtil, y, { align: 'right' })

  aplicarPiePagina(doc)
  doc.save(`${project.metadatos?.nombreObra || 'proyecto'} - Presupuesto.pdf`)
}

// ---------------------------------------------------------------------------
// Reporte: Guion de iluminación — versión A (solo iluminación, vertical)
// ---------------------------------------------------------------------------
export const exportarGuionLuzPdf = (project, infoFuncion = {}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  const anchoUtil = doc.internal.pageSize.getWidth() - 80
  const etiquetaCue = project.configuracion?.etiquetaCue ?? 'Cue'
  const yInicio = dibujarEncabezado(doc, 'Guion de iluminación', project, infoFuncion, anchoUtil)

  const escenas = project.escenas ?? []
  const luminarias = project.luminarias ?? []
  const biblioteca = project.biblioteca ?? { colores: [], posiciones: [] }

  const filas = escenas.map((escena, indice) => [
    escena.numero,
    escena.pie || '—',
    escena.nombre || '—',
    escena.tiempoEntrada,
    escena.tiempoSalida,
    construirTextoCambios(escenas, indice, luminarias, biblioteca),
    escena.anotaciones || '—',
  ])

  autoTable(doc, {
    startY: yInicio,
    margin: { left: 40, right: 40 },
    head: [[etiquetaCue, 'Pie', 'Nombre', 'Ent.', 'Sal.', 'Cambios', 'Anotación']],
    body: filas,
    styles: { fontSize: 8, cellPadding: 4, valign: 'top' },
    headStyles: { fillColor: [40, 40, 40], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 35 },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 150 },
    },
  })

  aplicarPiePagina(doc)
  doc.save(`${project.metadatos?.nombreObra || 'proyecto'} - Guion de iluminacion.pdf`)
}

// ---------------------------------------------------------------------------
// Reporte: Guion completo — versión B (incluye tramoya/audio/video, horizontal)
// ---------------------------------------------------------------------------
export const exportarGuionCompletoPdf = (project, infoFuncion = {}) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const anchoUtil = doc.internal.pageSize.getWidth() - 80
  const etiquetaCue = project.configuracion?.etiquetaCue ?? 'Cue'
  const yInicio = dibujarEncabezado(doc, 'Guion completo', project, infoFuncion, anchoUtil)

  const escenas = project.escenas ?? []
  const luminarias = project.luminarias ?? []
  const biblioteca = project.biblioteca ?? { colores: [], posiciones: [] }

  const filas = escenas.map((escena, indice) => [
    escena.numero,
    escena.pie || '—',
    escena.nombre || '—',
    escena.tiempoEntrada,
    escena.tiempoSalida,
    construirTextoCambios(escenas, indice, luminarias, biblioteca),
    escena.tramoya || '—',
    escena.audio || '—',
    escena.videoEfectos || '—',
    escena.anotaciones || '—',
  ])

  autoTable(doc, {
    startY: yInicio,
    margin: { left: 40, right: 40 },
    head: [[etiquetaCue, 'Pie', 'Nombre', 'Ent.', 'Sal.', 'Cambios', 'Tramoya', 'Audio', 'Video/Efectos', 'Anotación']],
    body: filas,
    styles: { fontSize: 8, cellPadding: 4, valign: 'top' },
    headStyles: { fillColor: [40, 40, 40], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 32 },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 26, halign: 'right' },
    },
  })

  aplicarPiePagina(doc)
  doc.save(`${project.metadatos?.nombreObra || 'proyecto'} - Guion completo.pdf`)
}

export { APP_NAME, FOOTER_TEXT, dibujarEncabezado, aplicarPiePagina, construirTextoCambios }
