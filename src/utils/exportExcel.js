// Módulo 8 — Exportación a Excel
// Genera el libro del Guion (4 hojas: Escenas, Estados detallados, Luminarias,
// Biblioteca) y el libro de Presupuesto, usando ExcelJS para soporte real de
// tablas nativas (filtro por columna, bandas de color) y formato de celda.
//
// Decisión de alcance confirmada: Biblioteca usa 1 sola hoja con 3 tablas
// independientes (Colores, Posiciones, Gobos), cada una con su propio objeto
// Table (addTable), ya que el estándar OOXML permite múltiples tablas por
// hoja aunque solo un autofiltro clásico — usamos Table, no AutoFilter.
import ExcelJS from 'exceljs'
import { calcularDeltas, resolverIntensidad, resolverColor, resolverPosicion } from './helpers'
import { APP_NAME } from './exportPdf'

const TEXTO_MARCA = `Generado por ${APP_NAME}`

// ---------------------------------------------------------------------------
// Estilos reutilizables
// ---------------------------------------------------------------------------
const ESTILO_ENCABEZADO = {
  font: { bold: true, color: { argb: 'FF000000' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } },
  alignment: { vertical: 'middle' },
}

const ESTILO_MARCA = {
  font: { italic: true, size: 9, color: { argb: 'FF999999' } },
}

const ESTILO_TITULO_TABLA = {
  font: { bold: true, size: 11, color: { argb: 'FFB47814' } },
}

// Aplica metadata de autoría/compañía al workbook
const aplicarMetadataWorkbook = (wb) => {
  wb.creator = APP_NAME
  wb.company = APP_NAME
  wb.title = 'Reporte LightScript'
}

// Escribe la fila de marca en A1 de la hoja (fuera de cualquier tabla)
const escribirMarca = (ws) => {
  ws.getCell('A1').value = TEXTO_MARCA
  ws.getCell('A1').style = ESTILO_MARCA
}

// Aplica alineación derecha a columnas numéricas en un rango de filas
const aplicarAlineacionColumnas = (ws, totalFilas, filaInicio, colsNumericas) => {
  for (let f = filaInicio; f <= totalFilas; f++) {
    colsNumericas.forEach((col) => {
      ws.getCell(f, col).alignment = { horizontal: 'right' }
    })
  }
}

// ---------------------------------------------------------------------------
// Construye un valor richText para la columna "Cambios": cada identificador
// de luminaria/grupo (antes de ".-") va en negritas, el resto en texto normal.
// Replica el formato visual de FilaEscena en SceneManager.jsx.
// ---------------------------------------------------------------------------
const construirRichTextCambios = (escenas, indice, luminarias, biblioteca) => {
  const escena = escenas[indice]
  if (escena.todoACero) {
    return { richText: [{ font: { bold: true }, text: 'Todo a 0 (blackout)' }] }
  }

  const deltas = calcularDeltas(escenas, indice)
  if (deltas.length === 0) return { richText: [{ text: '—' }] }

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

  const lineas = [] // { etiqueta, contenido }
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
      lineas.push({ etiqueta: grupo.nombre, contenido: partesLinea(deltasPorLum[miembrosConCambio[0]]) })
      miembrosConCambio.forEach((id) => lumsYaMostradas.add(id))
    }
  }

  lumsConCambio.forEach((lum) => {
    if (lumsYaMostradas.has(lum.id)) return
    lineas.push({ etiqueta: lum.numero, contenido: partesLinea(deltasPorLum[lum.id]) })
  })

  // Construye los fragmentos richText: "etiqueta" en negritas + ".- contenido" normal
  const fragmentos = []
  lineas.forEach((linea, i) => {
    if (i > 0) fragmentos.push({ text: '   ' })
    fragmentos.push({ font: { bold: true }, text: String(linea.etiqueta) })
    fragmentos.push({ text: `.- ${linea.contenido}` })
  })

  return { richText: fragmentos }
}

// ---------------------------------------------------------------------------
// Hoja: Escenas
// ---------------------------------------------------------------------------
const construirHojaEscenas = (wb, project) => {
  const escenas = project.escenas ?? []
  const luminarias = project.luminarias ?? []
  const biblioteca = project.biblioteca ?? { colores: [], posiciones: [] }
  const etiquetaCue = project.configuracion?.etiquetaCue ?? 'Cue'

  const ws = wb.addWorksheet('Escenas')
  escribirMarca(ws)

  const columnas = [
    { name: etiquetaCue, filterButton: true },
    { name: 'Pie', filterButton: true },
    { name: 'Nombre', filterButton: true },
    { name: 'Tiempo entrada (s)', filterButton: true },
    { name: 'Tiempo salida (s)', filterButton: true },
    { name: 'Cambios', filterButton: false }, // richText no es filtrable de forma fiable
    { name: 'Tramoya', filterButton: true },
    { name: 'Audio', filterButton: true },
    { name: 'Video y Efectos', filterButton: true },
    { name: 'Anotaciones', filterButton: true },
  ]

  const filas = escenas.map((escena) => [
    escena.numero, escena.pie || '', escena.nombre || '',
    escena.tiempoEntrada, escena.tiempoSalida,
    '', // se sobreescribe abajo con richText
    escena.tramoya || '', escena.audio || '', escena.videoEfectos || '', escena.anotaciones || '',
  ])

  ws.addTable({
    name: 'TablaEscenas',
    ref: 'A3',
    headerRow: true,
    style: { theme: 'TableStyleLight1', showRowStripes: true },
    columns: columnas,
    rows: filas,
  })

  // Sobreescribe celdas de "Cambios" con richText (col F = 6, fila de datos inicia en 4)
  escenas.forEach((escena, indice) => {
    ws.getCell(4 + indice, 6).value = construirRichTextCambios(escenas, indice, luminarias, biblioteca)
  })

  ws.getRow(3).eachCell((cell) => { cell.style = ESTILO_ENCABEZADO })

  ws.columns = [
    { width: 8 }, { width: 26 }, { width: 26 }, { width: 14 }, { width: 14 },
    { width: 42 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 30 },
  ]

  aplicarAlineacionColumnas(ws, 3 + escenas.length, 4, [1, 4, 5])
  ws.views = [{ state: 'frozen', ySplit: 3 }]
}

// ---------------------------------------------------------------------------
// Hoja: Estados detallados — matriz luminaria × escena.
// No usa addTable (encabezado de 2 niveles no es compatible con Table), se
// formatea manualmente con estilos equivalentes.
// ---------------------------------------------------------------------------
const construirHojaEstadosDetallados = (wb, project) => {
  const escenas = project.escenas ?? []
  const luminarias = [...(project.luminarias ?? [])].sort((a, b) => Number(a.numero) - Number(b.numero))
  const biblioteca = project.biblioteca ?? { colores: [], posiciones: [] }
  const etiquetaCue = project.configuracion?.etiquetaCue ?? 'Cue'

  const ws = wb.addWorksheet('Estados detallados')
  escribirMarca(ws)

  const fila1 = [etiquetaCue, 'Nombre', 'Tiempo']
  const fila2 = ['', '', '']
  const colsIntensidad = []

  luminarias.forEach((lum) => {
    fila1.push(`${lum.numero}. ${lum.nombre}`)
    fila2.push('Intensidad')
    colsIntensidad.push(fila1.length)
    if (lum.tipoColor === 'variable') { fila1.push(''); fila2.push('Color') }
    if (lum.esRobotica) { fila1.push(''); fila2.push('Posición') }
  })

  ws.addRow(fila1)
  ws.addRow(fila2)

  escenas.forEach((escena, indice) => {
    const fila = [escena.numero, escena.nombre || '', `${escena.tiempoEntrada}s / ${escena.tiempoSalida}s`]
    luminarias.forEach((lum) => {
      fila.push(resolverIntensidad(escenas, indice, lum.id))
      if (lum.tipoColor === 'variable') {
        const colorId = resolverColor(escenas, indice, lum.id)
        fila.push(colorId ? biblioteca.colores.find((c) => c.id === colorId)?.nombre ?? '—' : '—')
      }
      if (lum.esRobotica) {
        const posId = resolverPosicion(escenas, indice, lum.id)
        fila.push(posId ? biblioteca.posiciones.find((p) => p.id === posId)?.nombre ?? '—' : '—')
      }
    })
    ws.addRow(fila)
  })

  ws.getRow(3).eachCell((cell) => { cell.style = ESTILO_ENCABEZADO })
  ws.getRow(4).eachCell((cell) => { cell.style = ESTILO_ENCABEZADO })
  for (let c = 4; c <= fila1.length; c++) ws.getCell(3, c).font = { bold: true }

  ws.getColumn(1).width = 8
  ws.getColumn(2).width = 24
  ws.getColumn(3).width = 16
  for (let c = 4; c <= fila1.length; c++) ws.getColumn(c).width = 12

  aplicarAlineacionColumnas(ws, 4 + escenas.length, 5, [1, ...colsIntensidad])
  ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 4 }]
}

// ---------------------------------------------------------------------------
// Hoja: Luminarias
// ---------------------------------------------------------------------------
const construirHojaLuminarias = (wb, project) => {
  const luminarias = [...(project.luminarias ?? [])].sort((a, b) => Number(a.numero) - Number(b.numero))
  const gobos = project.biblioteca?.gobos ?? []

  const ws = wb.addWorksheet('Luminarias')
  escribirMarca(ws)

  const filas = luminarias.map((lum) => {
    const gobo = gobos.find((g) => g.id === lum.gobo_id)
    let color = '—'
    if (lum.tipoColor === 'fijo') color = lum.colorFijo?.nombre || lum.colorFijo?.hex || '—'
    if (lum.tipoColor === 'variable') color = 'Variable'

    return [
      Number(lum.numero), lum.nombre || '—', lum.nombreGrupo || '—', lum.tipo || '—',
      lum.posicion || '—', color, lum.afoque || '—', gobo?.nombre || '—', lum.notas || '—',
    ]
  })

  ws.addTable({
    name: 'TablaLuminarias',
    ref: 'A3',
    headerRow: true,
    style: { theme: 'TableStyleLight1', showRowStripes: true },
    columns: [
      { name: 'Número', filterButton: true },
      { name: 'Nombre', filterButton: true },
      { name: 'Grupo', filterButton: true },
      { name: 'Tipo', filterButton: true },
      { name: 'Posición', filterButton: true },
      { name: 'Color', filterButton: true },
      { name: 'Afoque', filterButton: true },
      { name: 'Gobo', filterButton: true },
      { name: 'Notas', filterButton: true },
    ],
    rows: filas,
  })

  // Negritas en nombre de luminaria (columna B) para facilitar lectura
  for (let f = 0; f < filas.length; f++) {
    ws.getCell(4 + f, 2).font = { bold: true }
  }

  ws.getRow(3).eachCell((cell) => { cell.style = ESTILO_ENCABEZADO })
  ws.columns = [
    { width: 9 }, { width: 24 }, { width: 18 }, { width: 18 },
    { width: 18 }, { width: 18 }, { width: 20 }, { width: 18 }, { width: 30 },
  ]
  aplicarAlineacionColumnas(ws, 3 + filas.length, 4, [1])
  ws.views = [{ state: 'frozen', ySplit: 3 }]
}

// ---------------------------------------------------------------------------
// Hoja: Biblioteca — 3 tablas independientes (Colores, Posiciones, Gobos)
// en una sola hoja, cada una con su propio objeto Table y filtro propio.
// ---------------------------------------------------------------------------
const construirHojaBiblioteca = (wb, project) => {
  const biblioteca = {
    colores: project.biblioteca?.colores ?? [],
    posiciones: project.biblioteca?.posiciones ?? [],
    gobos: project.biblioteca?.gobos ?? [],
  }

  const ws = wb.addWorksheet('Biblioteca')
  escribirMarca(ws)

  let filaActual = 3

  // --- Tabla Colores ---
  ws.getCell(filaActual, 1).value = 'COLORES'
  ws.getCell(filaActual, 1).style = ESTILO_TITULO_TABLA
  filaActual += 1
  const colores = [...biblioteca.colores].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  ws.addTable({
    name: 'TablaColores',
    ref: `A${filaActual}`,
    headerRow: true,
    style: { theme: 'TableStyleLight1', showRowStripes: true },
    columns: [
      { name: 'Nombre', filterButton: true },
      { name: 'Hex', filterButton: true },
      { name: 'Descripción', filterButton: true },
    ],
    rows: colores.map((c) => [c.nombre, c.hex, c.descripcion || '—']),
  })
  ws.getRow(filaActual).eachCell((cell) => { cell.style = ESTILO_ENCABEZADO })
  for (let f = 0; f < colores.length; f++) ws.getCell(filaActual + 1 + f, 1).font = { bold: true }
  filaActual += colores.length + 3

  // --- Tabla Posiciones ---
  ws.getCell(filaActual, 1).value = 'POSICIONES'
  ws.getCell(filaActual, 1).style = ESTILO_TITULO_TABLA
  filaActual += 1
  const posiciones = [...biblioteca.posiciones].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  ws.addTable({
    name: 'TablaPosiciones',
    ref: `A${filaActual}`,
    headerRow: true,
    style: { theme: 'TableStyleLight1', showRowStripes: true },
    columns: [
      { name: 'Nombre', filterButton: true },
      { name: 'Descripción', filterButton: true },
    ],
    rows: posiciones.map((p) => [p.nombre, p.descripcion || '—']),
  })
  ws.getRow(filaActual).eachCell((cell) => { cell.style = ESTILO_ENCABEZADO })
  for (let f = 0; f < posiciones.length; f++) ws.getCell(filaActual + 1 + f, 1).font = { bold: true }
  filaActual += posiciones.length + 3

  // --- Tabla Gobos ---
  ws.getCell(filaActual, 1).value = 'GOBOS'
  ws.getCell(filaActual, 1).style = ESTILO_TITULO_TABLA
  filaActual += 1
  const gobos = [...biblioteca.gobos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  ws.addTable({
    name: 'TablaGobos',
    ref: `A${filaActual}`,
    headerRow: true,
    style: { theme: 'TableStyleLight1', showRowStripes: true },
    columns: [
      { name: 'Nombre', filterButton: true },
      { name: 'Fabricante', filterButton: true },
      { name: 'Código', filterButton: true },
      { name: 'Descripción', filterButton: true },
    ],
    rows: gobos.map((g) => [g.nombre, g.fabricante || '—', g.codigoFabricante || '—', g.descripcion || '—']),
  })
  ws.getRow(filaActual).eachCell((cell) => { cell.style = ESTILO_ENCABEZADO })
  for (let f = 0; f < gobos.length; f++) ws.getCell(filaActual + 1 + f, 1).font = { bold: true }

  ws.columns = [{ width: 24 }, { width: 18 }, { width: 18 }, { width: 30 }]
}

// ---------------------------------------------------------------------------
// Generador principal: libro del Guion (4 hojas)
// ---------------------------------------------------------------------------
export const exportarGuionExcel = async (project) => {
  const wb = new ExcelJS.Workbook()
  aplicarMetadataWorkbook(wb)

  construirHojaEscenas(wb, project)
  construirHojaEstadosDetallados(wb, project)
  construirHojaLuminarias(wb, project)
  construirHojaBiblioteca(wb, project)

  const buffer = await wb.xlsx.writeBuffer()
  descargarBuffer(buffer, `${project.metadatos?.nombreObra || 'proyecto'} - Guion.xlsx`)
}

// ---------------------------------------------------------------------------
// Generador: libro del Presupuesto
// ---------------------------------------------------------------------------
const ETIQUETAS_ORIGEN = { sinCosto: 'Provisto sin costo', renta: 'Renta', compra: 'Compra' }

const construirHojaPresupuesto = (wb, project) => {
  const items = project.presupuesto ?? []
  const totalRenta = items.filter((i) => i.origen === 'renta').reduce((s, i) => s + (i.costo || 0), 0)
  const totalCompra = items.filter((i) => i.origen === 'compra').reduce((s, i) => s + (i.costo || 0), 0)

  const ws = wb.addWorksheet('Presupuesto')
  escribirMarca(ws)

  const filas = items.map((item) => [
    item.cantidad, item.equipo, item.marca || '—', item.modelo || '—',
    ETIQUETAS_ORIGEN[item.origen] ?? item.origen, item.proveedor || '—', item.contacto || '—',
    item.origen === 'sinCosto' ? null : (item.costo ?? null),
    item.justificacion || '—', item.notas || '—',
  ])

  ws.addTable({
    name: 'TablaPresupuesto',
    ref: 'A3',
    headerRow: true,
    style: { theme: 'TableStyleLight1', showRowStripes: true },
    columns: [
      { name: 'Cantidad', filterButton: true },
      { name: 'Equipo', filterButton: true },
      { name: 'Marca', filterButton: true },
      { name: 'Modelo', filterButton: true },
      { name: 'Origen', filterButton: true },
      { name: 'Proveedor', filterButton: true },
      { name: 'Contacto', filterButton: true },
      { name: 'Costo', filterButton: true },
      { name: 'Justificación', filterButton: true },
      { name: 'Notas', filterButton: true },
    ],
    rows: filas,
  })

  ws.getRow(3).eachCell((cell) => { cell.style = ESTILO_ENCABEZADO })
  for (let f = 0; f < filas.length; f++) ws.getCell(4 + f, 2).font = { bold: true }

  ws.columns = [
    { width: 10 }, { width: 26 }, { width: 16 }, { width: 16 }, { width: 18 },
    { width: 20 }, { width: 20 }, { width: 14 }, { width: 30 }, { width: 30 },
  ]
  aplicarAlineacionColumnas(ws, 3 + filas.length, 4, [1, 8])

  let y = 3 + filas.length + 2
  ws.getCell(y, 9).value = 'Total renta'
  ws.getCell(y, 9).font = { bold: true }
  ws.getCell(y, 10).value = totalRenta
  ws.getCell(y, 10).alignment = { horizontal: 'right' }
  y += 1
  ws.getCell(y, 9).value = 'Total compra'
  ws.getCell(y, 9).font = { bold: true }
  ws.getCell(y, 10).value = totalCompra
  ws.getCell(y, 10).alignment = { horizontal: 'right' }
  y += 1
  ws.getCell(y, 9).value = 'Total general'
  ws.getCell(y, 9).font = { bold: true, color: { argb: 'FFB47814' } }
  ws.getCell(y, 10).value = totalRenta + totalCompra
  ws.getCell(y, 10).font = { bold: true, color: { argb: 'FFB47814' } }
  ws.getCell(y, 10).alignment = { horizontal: 'right' }
}

export const exportarPresupuestoExcel = async (project) => {
  const wb = new ExcelJS.Workbook()
  aplicarMetadataWorkbook(wb)
  construirHojaPresupuesto(wb, project)
  const buffer = await wb.xlsx.writeBuffer()
  descargarBuffer(buffer, `${project.metadatos?.nombreObra || 'proyecto'} - Presupuesto.xlsx`)
}

// ---------------------------------------------------------------------------
// Helper de descarga — ExcelJS entrega un ArrayBuffer, no escribe archivo
// directamente como SheetJS; se construye el Blob y se dispara la descarga.
// ---------------------------------------------------------------------------
const descargarBuffer = (buffer, nombreArchivo) => {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}