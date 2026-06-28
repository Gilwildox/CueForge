// Módulo Light Plot v3
// Canvas 1200×850px (reducido para mejor legibilidad en PDF).
// Pan con scroll nativo del wrapper (overflow scroll).
// Inspector lateral persistente.
// Grid opcional con toggle.
// Snap a grid desactivable.
// Plantilla de escenario rápida con varas editables.
// Etiquetas opcionales en varas.
// Imagen de fondo: solo en sesión (no persiste en JSON).
// Botón de borrar en barra cuando hay selección.

import { useState, useRef, useCallback, useEffect } from 'react'
import { saveProject } from '../../db/database'
import { generateId } from '../../utils/helpers'
import {
  SIMBOLOS_MAP,
  SIMBOLOS_DISPONIBLES,
  TIPO_A_SIMBOLO,
  resolverColorLuminaria,
  resolverSimbolo,
  COLOR_DEFAULT,
} from '../../utils/lightPlotSymbols.jsx'

// ---------------------------------------------------------------------------
// Constantes canvas — reducido para legibilidad en impresión
// ---------------------------------------------------------------------------
const CANVAS_W  = 1200
const CANVAS_H  = 850
const ZOOM_MIN  = 0.3
const ZOOM_MAX  = 3.0
const ZOOM_STEP = 0.1
const GRID_SIZE = 50   // px del grid
const SNAP_SIZE = 25   // snap a cuadrícula (mitad del grid)

const STROKE_SIM    = '#ffffff'
const STROKE_STRUCT = '#94a3b8'

const HERRAMIENTAS = [
  { id: 'select', label: 'Seleccionar', tecla: 'V', icon: '↖' },
  { id: 'line',   label: 'Línea',       tecla: 'L', icon: '╱' },
  { id: 'rect',   label: 'Rectángulo',  tecla: 'R', icon: '▭' },
  { id: 'vara',   label: 'Vara',        tecla: 'P', icon: '⊣⊢' },
  { id: 'text',   label: 'Texto',       tecla: 'T', icon: 'Aa' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const createEmptyLightPlot = () => ({
  instancias:      [],
  elementos:       [],
  symbolOverrides: {},
  // imagenFondo NO se persiste — solo en memoria de sesión
})

const snapGrid = (v, snap) => Math.round(v / snap) * snap

const ortogonal = (x1, y1, x2, y2, shift) => {
  if (!shift) return { x2, y2 }
  return Math.abs(x2 - x1) >= Math.abs(y2 - y1)
    ? { x2, y2: y1 }
    : { x2: x1, y2 }
}

// ---------------------------------------------------------------------------
// SimboloSVG
// ---------------------------------------------------------------------------
function SimboloSVG({ tipo, fill, stroke, scale = 1 }) {
  const Comp = SIMBOLOS_MAP[tipo] ?? SIMBOLOS_MAP.generico
  return (
    <g transform={`scale(${scale})`}>
      <Comp fill={fill} stroke={stroke} />
    </g>
  )
}

// ---------------------------------------------------------------------------
// SelectorSimbolo — modal para tipos personalizados
// ---------------------------------------------------------------------------
function SelectorSimbolo({ onSeleccionar, onCancelar }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-5 w-80 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-white">¿Qué símbolo usar?</h3>
        <div className="grid grid-cols-3 gap-2">
          {SIMBOLOS_DISPONIBLES.map((s) => {
            const Comp = SIMBOLOS_MAP[s.key]
            return (
              <button key={s.key} onClick={() => onSeleccionar(s.key)}
                className="flex flex-col items-center gap-1 p-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors">
                <svg viewBox="-22 -34 44 68" width="40" height="60">
                  <Comp fill={COLOR_DEFAULT} stroke={STROKE_SIM} />
                </svg>
                <span className="text-xs text-gray-300 text-center leading-tight">{s.label}</span>
              </button>
            )
          })}
        </div>
        <button onClick={onCancelar}
          className="self-end text-xs text-gray-500 hover:text-white transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PanelInspectorInstancia — panel derecho persistente para luminarias
// ---------------------------------------------------------------------------
function PanelInspectorInstancia({ instancia, luminaria, onUpdate, onEliminar, onCerrar }) {
  const [form, setForm] = useState({ ...instancia })

  useEffect(() => { setForm({ ...instancia }) }, [instancia.id])

  const cambiar = (campo, valor) => {
    const act = { ...form, [campo]: valor }
    setForm(act)
    onUpdate(act)
  }

  const fill = luminaria ? resolverColorLuminaria(luminaria) : COLOR_DEFAULT
  const Comp = SIMBOLOS_MAP[form.simbolo] ?? SIMBOLOS_MAP.generico

  return (
    <div className="w-56 bg-gray-900 border-l border-gray-700 flex flex-col overflow-hidden shrink-0">
      {/* Encabezado */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 shrink-0 bg-gray-800">
        <span className="text-xs font-semibold text-white truncate">
          #{luminaria?.numero} · {luminaria?.nombre || 'Luminaria'}
        </span>
        <button onClick={onCerrar}
          className="text-gray-500 hover:text-white text-xl leading-none ml-1 shrink-0">×</button>
      </div>

      {/* Preview */}
      <div className="flex justify-center items-center py-4 border-b border-gray-800 bg-gray-950 shrink-0">
        <svg viewBox="-22 -36 44 72" width="56" height="88">
          <Comp fill={fill} stroke={STROKE_SIM} />
        </svg>
      </div>

      {/* Campos */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5">
        {[
          { campo: 'canal',     label: 'Canal / Número' },
          { campo: 'dimmer',    label: 'Dimmer / Circuito' },
          { campo: 'proposito', label: 'Propósito / Focus' },
          { campo: 'grupo',     label: 'Grupo' },
        ].map(({ campo, label }) => (
          <div key={campo} className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-500">{label}</label>
            <input type="text" value={form[campo] ?? ''}
              onChange={(e) => cambiar(campo, e.target.value)}
              className="bg-gray-800 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
          </div>
        ))}

        {/* Rotación */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-500">Rotación</label>
            <input type="number" min="0" max="359" value={form.rotacion ?? 0}
              onChange={(e) => cambiar('rotacion', ((Number(e.target.value) % 360) + 360) % 360)}
              className="bg-gray-800 text-white rounded px-1 py-0.5 text-xs w-14 text-right focus:outline-none focus:ring-1 focus:ring-amber-500" />
          </div>
          <input type="range" min="0" max="359" step="1" value={form.rotacion ?? 0}
            onChange={(e) => cambiar('rotacion', Number(e.target.value))}
            className="accent-amber-500" />
          {/* Accesos rápidos de rotación */}
          <div className="flex gap-1 flex-wrap">
            {[0, 45, 90, 135, 180, 270].map((deg) => (
              <button key={deg} onClick={() => cambiar('rotacion', deg)}
                className="px-1.5 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors">
                {deg}°
              </button>
            ))}
          </div>
        </div>

        {/* Escala */}
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-500">Escala: {(form.escala ?? 1).toFixed(1)}×</label>
          <input type="range" min="0.3" max="3.0" step="0.1" value={form.escala ?? 1}
            onChange={(e) => cambiar('escala', Number(e.target.value))}
            className="accent-amber-500" />
        </div>

        {/* Símbolo */}
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-500">Símbolo</label>
          <select value={form.simbolo}
            onChange={(e) => cambiar('simbolo', e.target.value)}
            className="bg-gray-800 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500">
            {SIMBOLOS_DISPONIBLES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Notas */}
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-500">Notas</label>
          <textarea rows={3} value={form.notas ?? ''}
            onChange={(e) => cambiar('notas', e.target.value)}
            className="bg-gray-800 text-white rounded px-2 py-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-amber-500" />
        </div>

        <button onClick={onEliminar}
          className="w-full text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 rounded py-1.5 transition-colors mt-1">
          Eliminar del plano
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PanelInspectorElemento — panel derecho persistente para elementos estructurales
// ---------------------------------------------------------------------------
function PanelInspectorElemento({ elemento, onUpdate, onEliminar, onCerrar }) {
  const cambiar = (campo, valor) => onUpdate({ ...elemento, [campo]: valor })

  const tipoLabel = {
    line: 'Línea', rect: 'Rectángulo', vara: 'Vara / Percha', text: 'Texto'
  }

  return (
    <div className="w-56 bg-gray-900 border-l border-gray-700 flex flex-col overflow-hidden shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 shrink-0 bg-gray-800">
        <span className="text-xs font-semibold text-white">
          {tipoLabel[elemento.tipo] ?? elemento.tipo}
        </span>
        <button onClick={onCerrar}
          className="text-gray-500 hover:text-white text-xl leading-none ml-1 shrink-0">×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5">
        {/* Color */}
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-500">Color</label>
          <input type="color" value={elemento.color || STROKE_STRUCT}
            onChange={(e) => cambiar('color', e.target.value)}
            className="w-full h-8 rounded cursor-pointer border-0" />
        </div>

        {/* Grosor */}
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-500">Grosor: {elemento.grosor ?? 2}px</label>
          <input type="range" min="1" max="16" step="1"
            value={elemento.grosor ?? 2}
            onChange={(e) => cambiar('grosor', Number(e.target.value))}
            className="accent-amber-500" />
        </div>

        {/* Etiqueta (varas y textos) */}
        {(elemento.tipo === 'vara' || elemento.tipo === 'text') && (
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-500">
              {elemento.tipo === 'vara' ? 'Etiqueta de la vara' : 'Texto'}
            </label>
            <input type="text" value={elemento.etiqueta ?? elemento.texto ?? ''}
              onChange={(e) => cambiar(
                elemento.tipo === 'text' ? 'texto' : 'etiqueta',
                e.target.value
              )}
              placeholder={elemento.tipo === 'vara' ? 'Ej: Vara 1, FOH...' : 'Escribe aquí'}
              className="bg-gray-800 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
          </div>
        )}

        <button onClick={onEliminar}
          className="w-full text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 rounded py-1.5 transition-colors mt-1">
          Eliminar elemento
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PanelLuminarias — lateral izquierdo
// ---------------------------------------------------------------------------
function PanelLuminarias({ luminarias, instancias, lightPlot, onDragStart, onClickColocar }) {
  const enPlano   = new Set(instancias.map((i) => i.lumId))
  const ordenadas = [...luminarias].sort((a, b) => Number(a.numero) - Number(b.numero))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-700 shrink-0 bg-gray-800">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Luminarias</p>
        <p className="text-xs text-gray-600 mt-0.5">{luminarias.length} registradas</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {luminarias.length === 0 ? (
          <p className="text-xs text-gray-600 p-3">Registra luminarias primero.</p>
        ) : (
          <div className="flex flex-col gap-0.5 p-2">
            {ordenadas.map((lum) => {
              const clave     = resolverSimbolo(lum, lightPlot)
              const fill      = resolverColorLuminaria(lum)
              const yaEnPlano = enPlano.has(lum.id)
              const Comp      = SIMBOLOS_MAP[clave] ?? SIMBOLOS_MAP.generico

              return (
                <div key={lum.id}
                  draggable={!yaEnPlano}
                  onDragStart={!yaEnPlano ? (e) => onDragStart(e, lum) : undefined}
                  onClick={!yaEnPlano ? () => onClickColocar(lum) : undefined}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded select-none transition-colors
                    ${yaEnPlano
                      ? 'opacity-40 cursor-not-allowed'
                      : 'cursor-grab active:cursor-grabbing hover:bg-gray-700'}`}
                  title={yaEnPlano ? 'Ya está en el plano' : 'Arrastra o click para colocar'}
                >
                  <svg viewBox="-22 -36 44 72" width="22" height="34" className="shrink-0">
                    <Comp fill={fill} stroke={STROKE_SIM} />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-xs text-white font-medium truncate">#{lum.numero} {lum.nombre}</p>
                    <p className="text-xs text-gray-500 truncate">{lum.tipo || '—'}</p>
                    {lum.tipoColor === 'fijo' && lum.colorFijo?.hex && (
                      <span className="flex items-center gap-1 mt-0.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full border border-gray-600"
                          style={{ backgroundColor: lum.colorFijo.hex }} />
                        <span className="text-xs text-gray-500 truncate">{lum.colorFijo.nombre}</span>
                      </span>
                    )}
                  </div>
                  {yaEnPlano && (
                    <span className="ml-auto text-xs text-amber-500 shrink-0">●</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// BarraHerramientas
// ---------------------------------------------------------------------------
function BarraHerramientas({
  herramienta, setHerramienta,
  zoom, setZoom,
  colorTrazo, setColorTrazo,
  mostrarGrid, setMostrarGrid,
  snapActivo, setSnapActivo,
  tieneFondo, onImportarFondo, onLimpiarFondo,
  haySeleccion, onEliminarSeleccion,
  onPlantillaEscenario,
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border-b border-gray-700 shrink-0 flex-wrap text-xs">

      {/* Herramientas */}
      <div className="flex gap-1">
        {HERRAMIENTAS.map((h) => (
          <button key={h.id} onClick={() => setHerramienta(h.id)}
            title={`${h.label} [${h.tecla}]`}
            className={`w-8 h-7 rounded font-mono transition-colors flex items-center justify-center
              ${herramienta === h.id
                ? 'bg-amber-500 text-black font-bold'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            {h.icon}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-gray-700" />

      {/* Borrar selección */}
      {haySeleccion && (
        <button onClick={onEliminarSeleccion}
          className="px-2 h-7 bg-red-900/60 hover:bg-red-800 text-red-300 rounded transition-colors">
          🗑 Borrar
        </button>
      )}

      {/* Color de trazo */}
      <div className="flex items-center gap-1">
        <span className="text-gray-500">Trazo</span>
        <input type="color" value={colorTrazo} onChange={(e) => setColorTrazo(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
      </div>

      <div className="w-px h-5 bg-gray-700" />

      {/* Grid y snap */}
      <button onClick={() => setMostrarGrid((v) => !v)}
        className={`px-2 h-7 rounded transition-colors ${mostrarGrid ? 'bg-amber-500 text-black font-bold' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
        title="Mostrar/ocultar cuadrícula">
        ⊞ Grid
      </button>

      <button onClick={() => setSnapActivo((v) => !v)}
        className={`px-2 h-7 rounded transition-colors ${snapActivo ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
        title="Activar/desactivar snap a grid">
        ⊕ Snap
      </button>

      <div className="w-px h-5 bg-gray-700" />

      {/* Plantilla escenario */}
      <button onClick={onPlantillaEscenario}
        className="px-2 h-7 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
        title="Insertar plantilla de escenario">
        🎭 Plantilla
      </button>

      <div className="w-px h-5 bg-gray-700" />

      {/* Fondo */}
      <button onClick={onImportarFondo}
        className="px-2 h-7 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors">
        {tieneFondo ? '🖼 Cambiar fondo' : '🖼 Importar plano'}
      </button>
      {tieneFondo && (
        <button onClick={onLimpiarFondo}
          className="px-2 h-7 bg-gray-700 hover:bg-gray-600 text-red-400 rounded transition-colors">
          Quitar fondo
        </button>
      )}

      {/* Tip shift */}
      {(herramienta === 'line' || herramienta === 'vara') && (
        <span className="text-gray-600 hidden md:inline">Shift = línea recta</span>
      )}

      {/* Zoom */}
      <div className="flex items-center gap-1 ml-auto">
        <button onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
          className="w-7 h-7 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded flex items-center justify-center">−</button>
        <span className="text-gray-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
          className="w-7 h-7 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded flex items-center justify-center">+</button>
        <button onClick={() => setZoom(0.7)} title="Restablecer zoom"
          className="w-7 h-7 bg-gray-700 hover:bg-gray-600 text-gray-400 rounded flex items-center justify-center">↺</button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LightPlot — componente principal
// ---------------------------------------------------------------------------
export default function LightPlot({ project, onUpdate }) {
  const lightPlot  = project.lightPlot ?? createEmptyLightPlot()
  const luminarias = project.luminarias ?? []

  // UI state
  const [herramienta, setHerramienta]     = useState('select')
  const [zoom, setZoom]                   = useState(0.7)
  const [colorTrazo, setColorTrazo]       = useState('#94a3b8')
  const [mostrarGrid, setMostrarGrid]     = useState(true)
  const [snapActivo, setSnapActivo]       = useState(true)
  const [selInst, setSelInst]             = useState(null) // id instancia
  const [selElem, setSelElem]             = useState(null) // id elemento
  const [dibujando, setDibujando]         = useState(null)
  const [shiftActivo, setShiftActivo]     = useState(false)
  const [pendienteCustom, setPendienteCustom] = useState(null)
  const [imagenFondoSesion, setImagenFondoSesion] = useState(null) // NO persiste
  // Arrastres
  const [arrastrando, setArrastrando]       = useState(null)
  const [arrastandoElem, setArrastandoElem] = useState(null)

  const svgRef      = useRef(null)
  const wrapperRef  = useRef(null)
  const fileInputRef = useRef(null)

  // Atajos de teclado
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'Shift') { setShiftActivo(true); return }
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'
        || e.target.tagName === 'SELECT') return
      const map = { v: 'select', l: 'line', r: 'rect', p: 'vara', t: 'text' }
      if (map[e.key.toLowerCase()]) setHerramienta(map[e.key.toLowerCase()])
      if (e.key === 'Escape') { setSelInst(null); setSelElem(null) }
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selInst || selElem)) {
        e.preventDefault()
        handleEliminarSeleccion()
      }
      if ((e.key === '+' || e.key === '=') && !e.ctrlKey)
        setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))
      if (e.key === '-' && !e.ctrlKey)
        setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))
    }
    const up = (e) => { if (e.key === 'Shift') setShiftActivo(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [selInst, selElem])

  // ---------------------------------------------------------------------------
  // Persistencia
  // ---------------------------------------------------------------------------
  const persistir = useCallback(async (nuevoLP) => {
    const act = { ...project, lightPlot: nuevoLP }
    onUpdate(act)
    await saveProject(act)
  }, [project, onUpdate])

  // ---------------------------------------------------------------------------
  // Coords canvas desde screen
  // ---------------------------------------------------------------------------
  const screenToCanvas = useCallback((clientX, clientY) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    let x = (clientX - rect.left) / zoom
    let y = (clientY - rect.top)  / zoom
    if (snapActivo) { x = snapGrid(x, SNAP_SIZE); y = snapGrid(y, SNAP_SIZE) }
    return { x, y }
  }, [zoom, snapActivo])

  // ---------------------------------------------------------------------------
  // Zoom con rueda del ratón centrado en el cursor
  // ---------------------------------------------------------------------------
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta  = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + delta).toFixed(2))))
  }, [])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // ---------------------------------------------------------------------------
  // Drag & Drop panel lateral
  // ---------------------------------------------------------------------------
  const handleDragStart = (e, lum) => e.dataTransfer.setData('lumId', lum.id)

  const colocarInstancia = (lum, pos, clave) => {
    if (lightPlot.instancias.some((i) => i.lumId === lum.id)) return
    const nueva = {
      id:        generateId(),
      lumId:     lum.id,
      x:         pos.x,
      y:         pos.y,
      rotacion:  0,
      escala:    1,
      simbolo:   clave,
      canal:     lum.numero,
      dimmer:    '',
      proposito: lum.afoque || '',
      grupo:     lum.nombreGrupo || '',
      notas:     '',
    }
    persistir({ ...lightPlot, instancias: [...lightPlot.instancias, nueva] })
    setPendienteCustom(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const lumId = e.dataTransfer.getData('lumId')
    if (!lumId) return
    const lum = luminarias.find((l) => l.id === lumId)
    if (!lum || lightPlot.instancias.some((i) => i.lumId === lum.id)) return
    const pos   = screenToCanvas(e.clientX, e.clientY)
    const clave = TIPO_A_SIMBOLO[lum.tipo]
    if (!clave) { setPendienteCustom({ lum, pos }); return }
    colocarInstancia(lum, pos, clave)
  }

  const handleClickColocar = (lum) => {
    if (lightPlot.instancias.some((i) => i.lumId === lum.id)) return
    const rect = wrapperRef.current?.getBoundingClientRect()
    const cx   = rect ? (rect.width  / 2 + wrapperRef.current.scrollLeft) / zoom : CANVAS_W / 2
    const cy   = rect ? (rect.height / 2 + wrapperRef.current.scrollTop)  / zoom : CANVAS_H / 2
    const clave = TIPO_A_SIMBOLO[lum.tipo]
    if (!clave) { setPendienteCustom({ lum, pos: { x: cx, y: cy } }); return }
    colocarInstancia(lum, { x: cx, y: cy }, clave)
  }

  const handleDragOver = (e) => e.preventDefault()

  // ---------------------------------------------------------------------------
  // Clicks en canvas
  // ---------------------------------------------------------------------------
  const handleSvgClick = (e) => {
    if (herramienta !== 'select') return
    if (e.target === svgRef.current || e.target.dataset.bg) {
      setSelInst(null); setSelElem(null)
    }
  }

  const handleInstanciaClick = (e, inst) => {
    e.stopPropagation()
    if (herramienta !== 'select') return
    setSelElem(null)
    setSelInst((p) => p === inst.id ? null : inst.id)
  }

  const handleInstanciaMouseDown = (e, inst) => {
    if (herramienta !== 'select' || e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const pos = screenToCanvas(e.clientX, e.clientY)
    setArrastrando({ id: inst.id, dx: pos.x - inst.x, dy: pos.y - inst.y })
    setSelElem(null)
    setSelInst(inst.id)
  }

  const handleElemClick = (e, elem) => {
    e.stopPropagation()
    if (herramienta !== 'select') return
    setSelInst(null)
    setSelElem((p) => p === elem.id ? null : elem.id)
  }

  const handleElemMouseDown = (e, elem) => {
    if (herramienta !== 'select' || e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const pos = screenToCanvas(e.clientX, e.clientY)
    setArrastandoElem({
      id: elem.id,
      ox1: elem.x1, oy1: elem.y1,
      ox2: elem.x2 ?? elem.x1, oy2: elem.y2 ?? elem.y1,
      mx: pos.x, my: pos.y,
    })
    setSelInst(null)
    setSelElem(elem.id)
  }

  // ---------------------------------------------------------------------------
  // MouseMove
  // ---------------------------------------------------------------------------
  const handleMouseMove = useCallback((e) => {
    if (arrastrando) {
      // Mover instancia (snap aplicado en screenToCanvas)
      const pos    = screenToCanvas(e.clientX, e.clientY)
      const nuevas = lightPlot.instancias.map((inst) =>
        inst.id === arrastrando.id
          ? { ...inst, x: pos.x - arrastrando.dx, y: pos.y - arrastrando.dy }
          : inst
      )
      onUpdate({ ...project, lightPlot: { ...lightPlot, instancias: nuevas } })
      return
    }
    if (arrastandoElem) {
      const pos = screenToCanvas(e.clientX, e.clientY)
      const ddx = pos.x - arrastandoElem.mx
      const ddy = pos.y - arrastandoElem.my
      const nuevos = lightPlot.elementos.map((el) =>
        el.id === arrastandoElem.id
          ? { ...el, x1: arrastandoElem.ox1+ddx, y1: arastandoElem.oy1+ddy,
                     x2: arrastandoElem.ox2+ddx, y2: arrastandoElem.oy2+ddy }
          : el
      )
      onUpdate({ ...project, lightPlot: { ...lightPlot, elementos: nuevos } })
      return
    }
    if (dibujando) {
      const raw = (() => {
        const rect = svgRef.current?.getBoundingClientRect()
        if (!rect) return { x: 0, y: 0 }
        return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom }
      })()
      const { x2, y2 } = ortogonal(dibujando.x1, dibujando.y1, raw.x, raw.y, shiftActivo)
      const sx = snapActivo ? snapGrid(x2, SNAP_SIZE) : x2
      const sy = snapActivo ? snapGrid(y2, SNAP_SIZE) : y2
      setDibujando((prev) => ({ ...prev, x2: sx, y2: sy }))
    }
  }, [arrastrando, arrastandoElem, dibujando, shiftActivo, snapActivo, zoom, lightPlot, project, onUpdate, screenToCanvas])

  const handleMouseUp = useCallback(async () => {
    if (arrastrando) {
      await saveProject({ ...project, lightPlot })
      setArrastrando(null)
      return
    }
    if (arrastandoElem) {
      await saveProject({ ...project, lightPlot })
      setArrastandoElem(null)
      return
    }
    if (dibujando && dibujando.x2 !== undefined) {
      const elem = { ...dibujando, id: generateId() }
      await persistir({ ...lightPlot, elementos: [...lightPlot.elementos, elem] })
      setDibujando(null)
    }
  }, [arrastrando, arrastandoElem, dibujando, lightPlot, project, persistir])

  // ---------------------------------------------------------------------------
  // MouseDown en SVG (iniciar dibujo)
  // ---------------------------------------------------------------------------
  const handleSvgMouseDown = (e) => {
    if (herramienta === 'select' || e.button !== 0) return
    const pos = screenToCanvas(e.clientX, e.clientY)
    if (['line', 'vara', 'rect'].includes(herramienta)) {
      setDibujando({ tipo: herramienta, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, color: colorTrazo, grosor: 2 })
    } else if (herramienta === 'text') {
      const texto = prompt('Texto:')
      if (texto?.trim()) {
        const elem = { id: generateId(), tipo: 'text', x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, texto: texto.trim(), color: colorTrazo, grosor: 2 }
        persistir({ ...lightPlot, elementos: [...lightPlot.elementos, elem] })
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Actualizar / eliminar
  // ---------------------------------------------------------------------------
  const handleUpdateInstancia = (act) => {
    persistir({ ...lightPlot, instancias: lightPlot.instancias.map((i) => i.id === act.id ? act : i) })
  }

  const handleEliminarInstancia = (id) => {
    if (!confirm('¿Eliminar del plano?')) return
    persistir({ ...lightPlot, instancias: lightPlot.instancias.filter((i) => i.id !== id) })
    setSelInst(null)
  }

  const handleUpdateElemento = (act) => {
    persistir({ ...lightPlot, elementos: lightPlot.elementos.map((e) => e.id === act.id ? act : e) })
  }

  const handleEliminarElemento = (id) => {
    persistir({ ...lightPlot, elementos: lightPlot.elementos.filter((e) => e.id !== id) })
    setSelElem(null)
  }

  // Elimina lo que esté seleccionado actualmente
  const handleEliminarSeleccion = () => {
    if (selInst) handleEliminarInstancia(selInst)
    else if (selElem) handleEliminarElemento(selElem)
  }

  // ---------------------------------------------------------------------------
  // Fondo de sesión
  // ---------------------------------------------------------------------------
  const handleImportarFondo = () => fileInputRef.current?.click()

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    // Aviso: imagen solo en sesión
    const reader = new FileReader()
    reader.onload = (ev) => setImagenFondoSesion(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ---------------------------------------------------------------------------
  // Plantilla de escenario
  // ---------------------------------------------------------------------------
  const insertarPlantilla = () => {
    const cx = CANVAS_W / 2, cy = CANVAS_H / 2
    const esc_w = 600, esc_h = 350

    const nuevos = [
      // Borde del escenario
      {
        id: generateId(), tipo: 'rect',
        x1: cx - esc_w/2, y1: cy - esc_h/2,
        x2: cx + esc_w/2, y2: cy + esc_h/2,
        color: '#64748b', grosor: 3,
      },
      // Línea de boca de escenario
      {
        id: generateId(), tipo: 'line',
        x1: cx - esc_w/2, y1: cy + esc_h/2,
        x2: cx + esc_w/2, y2: cy + esc_h/2,
        color: '#e2e8f0', grosor: 4,
      },
      // Etiqueta escenario
      {
        id: generateId(), tipo: 'text',
        x1: cx - 40, y1: cy + 20,
        x2: cx - 40, y2: cy + 20,
        texto: 'ESCENARIO', color: '#64748b', grosor: 2,
      },
      // Vara de proscenio
      {
        id: generateId(), tipo: 'vara',
        x1: cx - esc_w/2 + 30, y1: cy - esc_h/2 + 60,
        x2: cx + esc_w/2 - 30, y2: cy - esc_h/2 + 60,
        color: '#94a3b8', grosor: 3, etiqueta: 'Vara 1',
      },
      // Vara 2
      {
        id: generateId(), tipo: 'vara',
        x1: cx - esc_w/2 + 30, y1: cy - esc_h/2 + 160,
        x2: cx + esc_w/2 - 30, y2: cy - esc_h/2 + 160,
        color: '#94a3b8', grosor: 3, etiqueta: 'Vara 2',
      },
      // Vara de proscenio FOH
      {
        id: generateId(), tipo: 'vara',
        x1: cx - esc_w/2 - 20, y1: cy + esc_h/2 + 60,
        x2: cx + esc_w/2 + 20, y2: cy + esc_h/2 + 60,
        color: '#94a3b8', grosor: 3, etiqueta: 'FOH',
      },
    ]
    persistir({ ...lightPlot, elementos: [...lightPlot.elementos, ...nuevos] })
  }

  // ---------------------------------------------------------------------------
  // Render elementos estructurales
  // ---------------------------------------------------------------------------
  const renderElemento = (elem) => {
    const esSel  = elem.id === selElem
    const color  = esSel ? '#fe6732' : (elem.color || STROKE_STRUCT)
    const grosor = elem.grosor ?? 2

    const interactProps = {
      key:         elem.id,
      onClick:     (e) => handleElemClick(e, elem),
      onMouseDown: (e) => handleElemMouseDown(e, elem),
      style:       { cursor: herramienta === 'select' ? 'pointer' : 'default' },
    }

    if (elem.tipo === 'line') return (
      <g key={elem.id}>
        <line {...interactProps} x1={elem.x1} y1={elem.y1} x2={elem.x2} y2={elem.y2}
          stroke="transparent" strokeWidth="14"/>
        <line x1={elem.x1} y1={elem.y1} x2={elem.x2} y2={elem.y2}
          stroke={color} strokeWidth={grosor} style={{ pointerEvents: 'none' }}/>
      </g>
    )

    if (elem.tipo === 'vara') {
      const dx  = (elem.x2??elem.x1) - elem.x1
      const dy  = (elem.y2??elem.y1) - elem.y1
      const len = Math.sqrt(dx*dx + dy*dy) || 1
      const nx  = -dy/len, ny = dx/len, t = 12
      // Centro para la etiqueta
      const mx  = (elem.x1 + (elem.x2??elem.x1)) / 2
      const my  = (elem.y1 + (elem.y2??elem.y1)) / 2
      return (
        <g key={elem.id} {...interactProps}>
          {/* Hit area */}
          <line x1={elem.x1} y1={elem.y1} x2={elem.x2??elem.x1} y2={elem.y2??elem.y1}
            stroke="transparent" strokeWidth="16"/>
          {/* Línea de vara */}
          <line x1={elem.x1} y1={elem.y1} x2={elem.x2??elem.x1} y2={elem.y2??elem.y1}
            stroke={color} strokeWidth={grosor+2} style={{ pointerEvents: 'none' }}/>
          {/* Topes */}
          <line x1={elem.x1+nx*t} y1={elem.y1+ny*t} x2={elem.x1-nx*t} y2={elem.y1-ny*t}
            stroke={color} strokeWidth={grosor} style={{ pointerEvents: 'none' }}/>
          <line x1={(elem.x2??elem.x1)+nx*t} y1={(elem.y2??elem.y1)+ny*t}
                x2={(elem.x2??elem.x1)-nx*t} y2={(elem.y2??elem.y1)-ny*t}
            stroke={color} strokeWidth={grosor} style={{ pointerEvents: 'none' }}/>
          {/* Etiqueta opcional */}
          {elem.etiqueta && (
            <text x={mx} y={my - 10} textAnchor="middle"
              fontSize="12" fontFamily="sans-serif" fill={color}
              style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {elem.etiqueta}
            </text>
          )}
        </g>
      )
    }

    if (elem.tipo === 'rect') {
      const x = Math.min(elem.x1, elem.x2??elem.x1)
      const y = Math.min(elem.y1, elem.y2??elem.y1)
      const w = Math.abs((elem.x2??elem.x1) - elem.x1)
      const h = Math.abs((elem.y2??elem.y1) - elem.y1)
      return (
        <g key={elem.id}>
          <rect {...interactProps} x={x} y={y} width={w} height={h}
            fill="transparent" stroke="transparent" strokeWidth="10"/>
          <rect x={x} y={y} width={w} height={h}
            fill="none" stroke={color} strokeWidth={grosor}
            style={{ pointerEvents: 'none' }}/>
        </g>
      )
    }

    if (elem.tipo === 'text') {
      const fs = Math.max(12, (elem.grosor ?? 2) * 4 + 6)
      return (
        <text key={elem.id} {...interactProps} x={elem.x1} y={elem.y1}
          fill={color} fontSize={fs} fontFamily="sans-serif">
          {elem.texto}
        </text>
      )
    }
    return null
  }

  // ---------------------------------------------------------------------------
  // Datos seleccionados
  // ---------------------------------------------------------------------------
  const instSel = lightPlot.instancias.find((i) => i.id === selInst)
  const lumSel  = instSel ? luminarias.find((l) => l.id === instSel.lumId) : null
  const elemSel = lightPlot.elementos.find((e) => e.id === selElem)
  const haySeleccion = Boolean(selInst || selElem)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 32px)' }}>

      <BarraHerramientas
        herramienta={herramienta} setHerramienta={setHerramienta}
        zoom={zoom} setZoom={setZoom}
        colorTrazo={colorTrazo} setColorTrazo={setColorTrazo}
        mostrarGrid={mostrarGrid} setMostrarGrid={setMostrarGrid}
        snapActivo={snapActivo} setSnapActivo={setSnapActivo}
        tieneFondo={Boolean(imagenFondoSesion)}
        onImportarFondo={handleImportarFondo}
        onLimpiarFondo={() => setImagenFondoSesion(null)}
        haySeleccion={haySeleccion}
        onEliminarSeleccion={handleEliminarSeleccion}
        onPlantillaEscenario={insertarPlantilla}
      />

      <div className="flex flex-1 overflow-hidden">

        {/* Panel izquierdo — luminarias */}
        <div className="w-48 bg-gray-900 border-r border-gray-700 shrink-0 flex flex-col overflow-hidden">
          <PanelLuminarias
            luminarias={luminarias}
            instancias={lightPlot.instancias}
            lightPlot={lightPlot}
            onDragStart={handleDragStart}
            onClickColocar={handleClickColocar}
          />
        </div>

        {/* Canvas — scroll nativo para pan */}
        <div
          ref={wrapperRef}
          className="flex-1 overflow-auto bg-gray-950 relative"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: herramienta === 'select' ? (arrastrando || arrastandoElem ? 'grabbing' : 'default') : 'crosshair' }}
        >
          {/* Aviso fondo de sesión */}
          {imagenFondoSesion && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-amber-900/80 text-amber-200 text-xs px-3 py-1 rounded pointer-events-none">
              La imagen de fondo es solo visual — no se guarda en el proyecto
            </div>
          )}

          {/* Contenedor del SVG con padding para que el borde sea visible */}
          <div className="p-8 inline-block">
            <svg
              ref={svgRef}
              width={CANVAS_W * zoom}
              height={CANVAS_H * zoom}
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              style={{
                display: 'block',
                background: '#111827',
                // Borde bien visible que delimita el área de trabajo
                border: '3px solid #4b5563',
                boxShadow: '0 0 0 1px #1f2937, 0 4px 32px rgba(0,0,0,0.6)',
              }}
              onClick={handleSvgClick}
              onMouseDown={handleSvgMouseDown}
            >
              {/* Imagen de fondo (sesión) */}
              {imagenFondoSesion && (
                <image href={imagenFondoSesion} x="0" y="0"
                  width={CANVAS_W} height={CANVAS_H}
                  opacity="0.45" preserveAspectRatio="xMidYMid meet"
                  data-bg="true" style={{ pointerEvents: 'none' }}/>
              )}

              {/* Grid opcional */}
              {mostrarGrid && (
                <>
                  <defs>
                    <pattern id="grid-minor" width={GRID_SIZE/2} height={GRID_SIZE/2} patternUnits="userSpaceOnUse">
                      <path d={`M ${GRID_SIZE/2} 0 L 0 0 0 ${GRID_SIZE/2}`}
                        fill="none" stroke="#1f2937" strokeWidth="0.5"/>
                    </pattern>
                    <pattern id="grid-major" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                      <rect width={GRID_SIZE} height={GRID_SIZE} fill="url(#grid-minor)"/>
                      <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
                        fill="none" stroke="#374151" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width={CANVAS_W} height={CANVAS_H} fill="url(#grid-major)"
                    style={{ pointerEvents: 'none' }}/>
                </>
              )}

              {/* Elementos estructurales */}
              <g id="draw-layer">
                {lightPlot.elementos.map(renderElemento)}
                {dibujando?.x2 !== undefined && renderElemento({ ...dibujando, id: '__preview__' })}
              </g>

              {/* Símbolos de luminaria */}
              <g id="sym-layer">
                {lightPlot.instancias.map((inst) => {
                  const lum  = luminarias.find((l) => l.id === inst.lumId)
                  const fill = lum ? resolverColorLuminaria(lum) : COLOR_DEFAULT
                  const esSel = inst.id === selInst
                  const esc   = inst.escala ?? 1

                  return (
                    <g key={inst.id}
                      transform={`translate(${inst.x},${inst.y}) rotate(${inst.rotacion ?? 0})`}
                      onClick={(e) => handleInstanciaClick(e, inst)}
                      onMouseDown={(e) => handleInstanciaMouseDown(e, inst)}
                      style={{ cursor: herramienta === 'select' ? 'pointer' : 'default' }}>

                      {esSel && (
                        <circle r={34 * esc} fill="none"
                          stroke="#fe6732" strokeWidth="1.5" strokeDasharray="5,3"
                          style={{ pointerEvents: 'none' }}/>
                      )}

                      <SimboloSVG tipo={inst.simbolo} fill={fill} stroke={STROKE_SIM} scale={esc}/>

                      {inst.canal != null && inst.canal !== '' && (
                        <text y={36 * esc} textAnchor="middle"
                          fontSize="12" fontFamily="sans-serif" fill="#ffffff"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}>
                          {inst.canal}
                        </text>
                      )}
                    </g>
                  )
                })}
              </g>
            </svg>
          </div>

          {/* Indicador de herramienta y zoom */}
          <div className="absolute bottom-3 right-3 text-xs text-gray-600 bg-gray-900/80 px-2 py-1 rounded pointer-events-none">
            {HERRAMIENTAS.find((h) => h.id === herramienta)?.label} · {Math.round(zoom * 100)}%
            {snapActivo && ' · Snap ⊕'}
          </div>
        </div>

        {/* Panel inspector derecho — persistente */}
        {instSel && lumSel && (
          <PanelInspectorInstancia
            key={instSel.id}
            instancia={instSel}
            luminaria={lumSel}
            onUpdate={handleUpdateInstancia}
            onEliminar={() => handleEliminarInstancia(instSel.id)}
            onCerrar={() => setSelInst(null)}
          />
        )}
        {elemSel && !instSel && (
          <PanelInspectorElemento
            key={elemSel.id}
            elemento={elemSel}
            onUpdate={handleUpdateElemento}
            onEliminar={() => handleEliminarElemento(elemSel.id)}
            onCerrar={() => setSelElem(null)}
          />
        )}
      </div>

      {/* Modal selector símbolo custom */}
      {pendienteCustom && (
        <SelectorSimbolo
          onSeleccionar={(c) => colocarInstancia(pendienteCustom.lum, pendienteCustom.pos, c)}
          onCancelar={() => setPendienteCustom(null)}
        />
      )}

      <input ref={fileInputRef} type="file" accept="image/*"
        className="hidden" onChange={handleFileChange}/>
    </div>
  )
}
