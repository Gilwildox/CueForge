// Módulo 8 — Exportación
// Módulo central único de reportes. No persiste datos en el proyecto:
// Venue y fecha de función son campos de captura libre solo para el documento.
// Modificación: agrega exportación PDF del plano de iluminación.
import { useState } from 'react'
import {
  exportarLuminariasPdf,
  exportarFichaTecnicaPdf,
  exportarPresupuestoPdf,
  exportarGuionLuzPdf,
  exportarGuionCompletoPdf,
} from '../../utils/exportPdf'
import { exportarGuionExcel, exportarPresupuestoExcel } from '../../utils/exportExcel'
import { exportarLightPlotPDF, generarSvgDesdeProject } from '../../utils/exportLightPlotPdf'

// ---------------------------------------------------------------------------
// TarjetaReporte — fila de acción para un reporte individual
// ---------------------------------------------------------------------------
function TarjetaReporte({ titulo, descripcion, botones }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex items-center justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold text-white">{titulo}</h3>
        {descripcion && <p className="text-xs text-gray-500 mt-0.5">{descripcion}</p>}
      </div>
      <div className="flex gap-2 shrink-0">
        {botones.map((b) => (
          <button
            key={b.label}
            onClick={b.onClick}
            disabled={b.disabled}
            className="px-3 py-1.5 text-xs font-semibold rounded transition-colors bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Export — componente principal
// ---------------------------------------------------------------------------
export default function Export({ project }) {
  // Campos libres no persistidos — solo viven en este módulo durante la sesión
  const [venue, setVenue] = useState('')
  const [fechaFuncion, setFechaFuncion] = useState('')
  const [exportandoPlano, setExportandoPlano] = useState(false)

  const infoFuncion = { venue: venue.trim(), fecha: fechaFuncion }

  const hayLuminarias  = (project.luminarias ?? []).length > 0
  const hayEscenas     = (project.escenas ?? []).length > 0
  const hayPresupuesto = (project.presupuesto ?? []).length > 0
  const hayPlano       = (project.lightPlot?.instancias ?? []).length > 0

  // Exportación del plano: construye el SVG en memoria (sin necesitar el DOM del canvas)
  const handleExportarPlano = async (incluirListado) => {
    setExportandoPlano(true)
    try {
      const svgElem = generarSvgDesdeProject(project)
      await exportarLightPlotPDF(project, svgElem, incluirListado)
    } catch (err) {
      console.error('Error exportando plano:', err)
      alert('Ocurrió un error al generar el PDF del plano.')
    } finally {
      setExportandoPlano(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Exportación</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Genera reportes en PDF y Excel a partir de la información del proyecto.
        </p>
      </div>

      {/* Datos de función — no se guardan en el proyecto */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-3">
        <p className="text-xs text-gray-500 uppercase tracking-wider">
          Datos de la función (solo para este documento, no se guardan en el proyecto)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Venue / Teatro</label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Ej: Teatro de la Ciudad"
              className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Fecha de función</label>
            <input
              type="text"
              value={fechaFuncion}
              onChange={(e) => setFechaFuncion(e.target.value)}
              placeholder="Ej: 12 de agosto, 2026"
              className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Lista de reportes */}
      <div className="flex flex-col gap-3">

        <TarjetaReporte
          titulo="Lista de luminarias"
          descripcion="Número, nombre, grupo, tipo, posición, color, afoque, gobo y notas."
          botones={[
            { label: 'PDF', onClick: () => exportarLuminariasPdf(project, infoFuncion), disabled: !hayLuminarias },
          ]}
        />

        <TarjetaReporte
          titulo="Ficha técnica"
          descripcion="Requerimientos del espacio, infraestructura eléctrica y operación."
          botones={[
            { label: 'PDF', onClick: () => exportarFichaTecnicaPdf(project, infoFuncion) },
          ]}
        />

        <TarjetaReporte
          titulo="Guion de iluminación"
          descripcion="Solo iluminación (vertical) o completo con tramoya/audio/video (horizontal)."
          botones={[
            { label: 'PDF (solo luz)',  onClick: () => exportarGuionLuzPdf(project, infoFuncion),      disabled: !hayEscenas },
            { label: 'PDF (completo)', onClick: () => exportarGuionCompletoPdf(project, infoFuncion), disabled: !hayEscenas },
            { label: 'Excel',          onClick: () => exportarGuionExcel(project),                    disabled: !hayEscenas },
          ]}
        />

        <TarjetaReporte
          titulo="Presupuesto"
          descripcion="Equipo, origen, proveedor y totales por renta/compra."
          botones={[
            { label: 'PDF',   onClick: () => exportarPresupuestoPdf(project, infoFuncion), disabled: !hayPresupuesto },
            { label: 'Excel', onClick: () => exportarPresupuestoExcel(project),             disabled: !hayPresupuesto },
          ]}
        />

        {/* Plano de iluminación */}
        <TarjetaReporte
          titulo="Plano de iluminación"
          descripcion={
            hayPlano
              ? `${project.lightPlot.instancias.length} luminaria${project.lightPlot.instancias.length !== 1 ? 's' : ''} colocada${project.lightPlot.instancias.length !== 1 ? 's' : ''} en el plano. Carta horizontal.`
              : 'El plano no tiene luminarias colocadas aún.'
          }
          botones={[
            {
              label:    exportandoPlano ? 'Generando…' : 'PDF',
              onClick:  () => handleExportarPlano(false),
              disabled: !hayPlano || exportandoPlano,
            },
            {
              label:    exportandoPlano ? 'Generando…' : 'PDF con listado',
              onClick:  () => handleExportarPlano(true),
              disabled: !hayPlano || exportandoPlano,
            },
          ]}
        />

      </div>
    </div>
  )
}
