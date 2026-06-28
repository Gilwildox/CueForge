// LightPlot v4 — fixes:
// - Selección persistente: umbral 4px para distinguir click de arrastre
// - Panel inspector como drawer lateral fijo, no condicionado a arrastre
// - Menú plantilla con objetos individuales
// - Objetos de plantilla: flag esPlantilla=true → solo grosor editable
// - Panel luminarias colapsable, ítems en plano al final de la lista
// - Al eliminar luminaria del plano → vuelve a estar disponible
// - typo arastandoElem corregido

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
// Constantes
// ---------------------------------------------------------------------------
const CANVAS_W  = 1200
const CANVAS_H  = 850
const ZOOM_MIN  = 0.3
const ZOOM_MAX  = 3.0
const ZOOM_STEP = 0.1
const GRID_SIZE = 50
const SNAP_SIZE = 25
const DRAG_UMBRAL = 4   // px en coordenadas canvas antes de considerar arrastre

const STROKE_SIM    = '#ffffff'
const STROKE_STRUCT = '#94a3b8'

const HERRAMIENTAS = [
  { id: 'select', label: 'Seleccionar', tecla: 'V', icon: '↖' },
  { id: 'line',   label: 'Línea',       tecla: 'L', icon: '╱' },
  { id: 'rect',   label: 'Rectángulo',  tecla: 'R', icon: '▭' },
  { id: 'vara',   label: 'Vara',        tecla: 'P', icon: '⊣⊢' },
  { id: 'text',   label: 'Texto',       tecla: 'T', icon: 'Aa' },
]

// Objetos disponibles en el menú de plantilla
const ITEMS_PLANTILLA = [
  { id: 'escenario_completo', label: 'Escenario completo', desc: 'Caja + boca + 2 varas + FOH' },
  { id: 'vara_sola',          label: 'Vara',               desc: 'Una vara horizontal editable' },
  { id: 'foh',                label: 'Línea FOH',          desc: 'Línea de frente de escena' },
  { id: 'caja_escenario',     label: 'Caja de escenario',  desc: 'Solo el rectángulo del escenario' },
  { id: 'proscenio',          label: 'Boca de escenario',  desc: 'Línea gruesa de proscenio' },
  { id: 'ciclorama',          label: 'Ciclorama',          desc: 'Línea curva trasera' },
]

// ---------------------------------------------------------------------------
export const createEmptyLightPlot = () => ({
  instancias:      [],
  elementos:       [],
  symbolOverrides: {},
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
// SelectorSimbolo
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
          className="self-end text-xs text-gray-500 hover:text-white transition-colors">Cancelar</button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PanelInspectorInstancia — drawer lateral FIJO, siempre montado cuando hay selección
// El problema anterior: se re-renderizaba con cada mousemove porque el estado
// de arrastre vivía en el mismo componente. Ahora el inspector solo depende
// de selInst (id string), que NO cambia durante el arrastre.
// ---------------------------------------------------------------------------
function PanelInspectorInstancia({ instancia, luminaria, onUpdate, onEliminar, onCerrar }) {
  const [form, setForm] = useState({ ...instancia })

  // Sincronizar SOLO cuando cambia la instancia seleccionada (distinto id)
  // NO sincronizar en cada actualización de posición (arrastre)
  useEffect(() => {
    setForm({ ...instancia })
  }, [instancia.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const cambiar = (campo, valor) => {
    const act = { ...form, [campo]: valor }
    setForm(act)
    onUpdate(act)
  }

  const fill = luminaria ? resolverColorLuminaria(luminaria) : COLOR_DEFAULT
  const Comp = SIMBOLOS_MAP[form.simbolo] ?? SIMBOLOS_MAP.generico

  return (
    <div className="w-56 bg-gray-900 border-l border-gray-700 flex flex-col overflow-hidden shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 shrink-0 bg-gray-800">
        <span className="text-xs font-semibold text-white truncate">
          #{luminaria?.numero} · {luminaria?.nombre || 'Luminaria'}
        </span>
        <button onClick={onCerrar}
          className="text-gray-400 hover:text-white text-xl leading-none ml-2 shrink-0">×</button>
      </div>

      {/* Preview */}
      <div className="flex justify-center items-center py-4 border-b border-gray-800 bg-gray-950 shrink-0">
        <svg viewBox="-22 -36 44 72" width="56" height="88">
          <Comp fill={fill} stroke={STROKE_SIM} />
        </svg>
      </div>

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
            <input type="number" min="0" max="359"
              value={form.rotacion ?? 0}
              onChange={(e) => cambiar('rotacion', ((Number(e.target.value) % 360) + 360) % 360)}
              className="bg-gray-800 text-white rounded px-1 py-0.5 text-xs w-14 text-right focus:outline-none focus:ring-1 focus:ring-amber-500" />
          </div>
          <input type="range" min="0" max="359" step="1"
            value={form.rotacion ?? 0}
            onChange={(e) => cambiar('rotacion', Number(e.target.value))}
            className="accent-amber-500" />
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
          <input type="range" min="0.3" max="3.0" step="0.1"
            value={form.escala ?? 1}
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
// PanelInspectorElemento
// Objetos de plantilla (esPlantilla=true): solo grosor y etiqueta, sin reposicionado
// ---------------------------------------------------------------------------
// PanelInspectorElemento
// Controles de tamaño calculados desde coordenadas:
//   - líneas y varas: longitud editable (se extiende simétricamente desde el centro)
//   - rectángulos: ancho y alto editables (se escalan desde el centro)
//   - todos: posición X/Y del centro, grosor, color, etiqueta
// ---------------------------------------------------------------------------
function PanelInspectorElemento({ elemento, onUpdate, onEliminar, onCerrar }) {
  const tipoLabel = { line: 'Línea', rect: 'Rectángulo', vara: 'Vara / Percha', text: 'Texto' }

  // Centro y dimensiones derivadas del elemento
  const cx  = ((elemento.x1 ?? 0) + (elemento.x2 ?? elemento.x1 ?? 0)) / 2
  const cy  = ((elemento.y1 ?? 0) + (elemento.y2 ?? elemento.y1 ?? 0)) / 2
  const dx  = (elemento.x2 ?? elemento.x1 ?? 0) - (elemento.x1 ?? 0)
  const dy  = (elemento.y2 ?? elemento.y1 ?? 0) - (elemento.y1 ?? 0)
  const longitud    = Math.round(Math.sqrt(dx * dx + dy * dy))
  const anchoRect   = Math.round(Math.abs(dx))
  const altoRect    = Math.round(Math.abs(dy))

  // Cambia una propiedad simple
  const cambiar = (campo, valor) => onUpdate({ ...elemento, [campo]: valor })

  // Cambia longitud de línea/vara manteniendo el ángulo y el centro
  const cambiarLongitud = (nuevaLong) => {
    if (nuevaLong < 1) return
    const angulo = Math.atan2(dy, dx)
    const mitad  = nuevaLong / 2
    onUpdate({
      ...elemento,
      x1: cx - Math.cos(angulo) * mitad,
      y1: cy - Math.sin(angulo) * mitad,
      x2: cx + Math.cos(angulo) * mitad,
      y2: cy + Math.sin(angulo) * mitad,
    })
  }

  // Cambia ancho de rectángulo manteniendo centro
  const cambiarAncho = (nuevoAncho) => {
    if (nuevoAncho < 1) return
    const mitad = nuevoAncho / 2
    const yMin  = Math.min(elemento.y1 ?? 0, elemento.y2 ?? 0)
    const yMax  = Math.max(elemento.y1 ?? 0, elemento.y2 ?? 0)
    onUpdate({ ...elemento, x1: cx - mitad, x2: cx + mitad, y1: yMin, y2: yMax })
  }

  // Cambia alto de rectángulo manteniendo centro
  const cambiarAlto = (nuevoAlto) => {
    if (nuevoAlto < 1) return
    const mitad = nuevoAlto / 2
    const xMin  = Math.min(elemento.x1 ?? 0, elemento.x2 ?? 0)
    const xMax  = Math.max(elemento.x1 ?? 0, elemento.x2 ?? 0)
    onUpdate({ ...elemento, x1: xMin, x2: xMax, y1: cy - mitad, y2: cy + mitad })
  }

  // Desplaza el centro (mueve el objeto)
  const cambiarCentro = (eje, valor) => {
    const n = Number(valor)
    if (isNaN(n)) return
    if (eje === 'x') {
      const desplazX = n - cx
      onUpdate({ ...elemento, x1: (elemento.x1 ?? 0) + desplazX, x2: (elemento.x2 ?? elemento.x1 ?? 0) + desplazX })
    } else {
      const desplazY = n - cy
      onUpdate({ ...elemento, y1: (elemento.y1 ?? 0) + desplazY, y2: (elemento.y2 ?? elemento.y1 ?? 0) + desplazY })
    }
  }

  const esLineal = elemento.tipo === 'line' || elemento.tipo === 'vara'
  const esRect   = elemento.tipo === 'rect'

  return (
    <div className="w-56 bg-gray-900 border-l border-gray-700 flex flex-col overflow-hidden shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 shrink-0 bg-gray-800">
        <span className="text-xs font-semibold text-white">
          {tipoLabel[elemento.tipo] ?? elemento.tipo}
        </span>
        <button onClick={onCerrar}
          className="text-gray-400 hover:text-white text-xl leading-none ml-2 shrink-0">×</button>
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

        {/* Tamaño — líneas y varas: longitud */}
        {esLineal && (
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-500">Longitud: {longitud}px</label>
            <input type="range" min="20" max="1100" step="5"
              value={longitud}
              onChange={(e) => cambiarLongitud(Number(e.target.value))}
              className="accent-amber-500" />
            <input type="number" min="20" max="1100" step="5"
              value={longitud}
              onChange={(e) => cambiarLongitud(Number(e.target.value))}
              className="bg-gray-800 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
          </div>
        )}

        {/* Tamaño — rectángulos: ancho y alto */}
        {esRect && (
          <>
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-gray-500">Ancho: {anchoRect}px</label>
              <input type="range" min="20" max="1100" step="5"
                value={anchoRect}
                onChange={(e) => cambiarAncho(Number(e.target.value))}
                className="accent-amber-500" />
              <input type="number" min="20" max="1100" step="5"
                value={anchoRect}
                onChange={(e) => cambiarAncho(Number(e.target.value))}
                className="bg-gray-800 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-gray-500">Alto: {altoRect}px</label>
              <input type="range" min="20" max="800" step="5"
                value={altoRect}
                onChange={(e) => cambiarAlto(Number(e.target.value))}
                className="accent-amber-500" />
              <input type="number" min="20" max="800" step="5"
                value={altoRect}
                onChange={(e) => cambiarAlto(Number(e.target.value))}
                className="bg-gray-800 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
          </>
        )}

        {/* Posición del centro */}
        {(esLineal || esRect) && (
          <div className="flex gap-2">
            <div className="flex flex-col gap-0.5 flex-1">
              <label className="text-xs text-gray-500">Centro X</label>
              <input type="number" step="5"
                value={Math.round(cx)}
                onChange={(e) => cambiarCentro('x', e.target.value)}
                className="bg-gray-800 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div className="flex flex-col gap-0.5 flex-1">
              <label className="text-xs text-gray-500">Centro Y</label>
              <input type="number" step="5"
                value={Math.round(cy)}
                onChange={(e) => cambiarCentro('y', e.target.value)}
                className="bg-gray-800 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
          </div>
        )}

        {/* Etiqueta — varas y textos */}
        {(elemento.tipo === 'vara' || elemento.tipo === 'text') && (
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-500">
              {elemento.tipo === 'vara' ? 'Etiqueta' : 'Texto'}
            </label>
            <input type="text"
              value={elemento.tipo === 'text' ? (elemento.texto ?? '') : (elemento.etiqueta ?? '')}
              onChange={(e) => cambiar(elemento.tipo === 'text' ? 'texto' : 'etiqueta', e.target.value)}
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
// PanelLuminarias — colapsable, ítems en plano al fondo
// ---------------------------------------------------------------------------
function PanelLuminarias({ luminarias, instancias, lightPlot, onDragStart, onClickColocar, colapsado, setColapsado }) {
  const enPlano   = new Set(instancias.map((i) => i.lumId))
  const disponibles = [...luminarias]
    .filter((l) => !enPlano.has(l.id))
    .sort((a, b) => Number(a.numero) - Number(b.numero))
  const enPlanoLista = [...luminarias]
    .filter((l) => enPlano.has(l.id))
    .sort((a, b) => Number(a.numero) - Number(b.numero))

  return (
    <div className={`flex flex-col overflow-hidden transition-all duration-200 ${colapsado ? 'w-10' : 'w-48'} bg-gray-900 border-r border-gray-700 shrink-0`}>
      {/* Header con toggle colapso */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-gray-700 shrink-0 bg-gray-800">
        {!colapsado && (
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">
            Luminarias
          </p>
        )}
        <button
          onClick={() => setColapsado((v) => !v)}
          className="text-gray-400 hover:text-white text-sm w-6 h-6 flex items-center justify-center rounded hover:bg-gray-700 transition-colors ml-auto"
          title={colapsado ? 'Expandir panel' : 'Colapsar panel'}>
          {colapsado ? '▶' : '◀'}
        </button>
      </div>

      {!colapsado && (
        <div className="flex-1 overflow-y-auto">
          {luminarias.length === 0 ? (
            <p className="text-xs text-gray-600 p-3">Registra luminarias primero.</p>
          ) : (
            <div className="flex flex-col">
              {/* Disponibles */}
              {disponibles.map((lum) => (
                <ItemLuminaria key={lum.id} lum={lum} enPlano={false}
                  lightPlot={lightPlot}
                  onDragStart={onDragStart} onClickColocar={onClickColocar} />
              ))}

              {/* Separador si hay en plano */}
              {enPlanoLista.length > 0 && (
                <div className="px-2 py-1 mt-1 border-t border-gray-800">
                  <p className="text-xs text-gray-600 uppercase tracking-wider">En plano</p>
                </div>
              )}

              {/* En plano — al final, opacidad reducida */}
              {enPlanoLista.map((lum) => (
                <ItemLuminaria key={lum.id} lum={lum} enPlano={true}
                  lightPlot={lightPlot}
                  onDragStart={onDragStart} onClickColocar={onClickColocar} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ItemLuminaria({ lum, enPlano, lightPlot, onDragStart, onClickColocar }) {
  const clave = resolverSimbolo(lum, lightPlot)
  const fill  = resolverColorLuminaria(lum)
  const Comp  = SIMBOLOS_MAP[clave] ?? SIMBOLOS_MAP.generico

  return (
    <div
      draggable={!enPlano}
      onDragStart={!enPlano ? (e) => onDragStart(e, lum) : undefined}
      onClick={!enPlano ? () => onClickColocar(lum) : undefined}
      className={`flex items-center gap-2 px-2 py-1.5 select-none transition-colors
        ${enPlano
          ? 'opacity-40 cursor-default'
          : 'cursor-grab active:cursor-grabbing hover:bg-gray-700'}`}
      title={enPlano ? 'Ya en el plano' : 'Arrastra o click para colocar'}
    >
      <svg viewBox="-22 -36 44 72" width="20" height="32" className="shrink-0">
        <Comp fill={fill} stroke={STROKE_SIM} />
      </svg>
      <div className="min-w-0">
        <p className="text-xs text-white font-medium truncate">#{lum.numero} {lum.nombre}</p>
        <p className="text-xs text-gray-500 truncate">{lum.tipo || '—'}</p>
      </div>
      {enPlano && <span className="ml-auto text-amber-500 text-xs shrink-0">●</span>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MenuPlantilla — dropdown con objetos individuales
// ---------------------------------------------------------------------------
function MenuPlantilla({ onInsertar, onCerrar }) {
  return (
    <div className="absolute top-full left-0 mt-1 z-30 bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-56 py-1"
      onMouseLeave={onCerrar}>
      {ITEMS_PLANTILLA.map((item) => (
        <button key={item.id}
          onClick={() => { onInsertar(item.id); onCerrar() }}
          className="w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors">
          <p className="text-xs text-white font-medium">{item.label}</p>
          <p className="text-xs text-gray-500">{item.desc}</p>
        </button>
      ))}
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
  onInsertarPlantilla,
}) {
  const [menuPlantillaAbierto, setMenuPlantillaAbierto] = useState(false)

  return (
    <div className="relative flex items-center gap-2 px-3 py-1.5 bg-gray-800 border-b border-gray-700 shrink-0 flex-wrap text-xs">
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

      {/* Borrar — solo cuando hay selección */}
      {haySeleccion && (
        <button onClick={onEliminarSeleccion}
          className="px-2 h-7 bg-red-900/60 hover:bg-red-800 text-red-300 rounded transition-colors">
          🗑 Borrar
        </button>
      )}

      {/* Color trazo */}
      <div className="flex items-center gap-1">
        <span className="text-gray-500">Trazo</span>
        <input type="color" value={colorTrazo} onChange={(e) => setColorTrazo(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
      </div>

      <div className="w-px h-5 bg-gray-700" />

      {/* Grid y snap */}
      <button onClick={() => setMostrarGrid((v) => !v)}
        className={`px-2 h-7 rounded transition-colors ${mostrarGrid ? 'bg-amber-500 text-black font-bold' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
        ⊞ Grid
      </button>
      <button onClick={() => setSnapActivo((v) => !v)}
        className={`px-2 h-7 rounded transition-colors ${snapActivo ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
        ⊕ Snap
      </button>

      <div className="w-px h-5 bg-gray-700" />

      {/* Plantilla — botón con dropdown */}
      <div className="relative">
        <button
          onClick={() => setMenuPlantillaAbierto((v) => !v)}
          className="px-2 h-7 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors flex items-center gap-1">
          🎭 Plantilla ▾
        </button>
        {menuPlantillaAbierto && (
          <MenuPlantilla
            onInsertar={onInsertarPlantilla}
            onCerrar={() => setMenuPlantillaAbierto(false)}
          />
        )}
      </div>

      <div className="w-px h-5 bg-gray-700" />

      {/* Fondo */}
      <button onClick={onImportarFondo}
        className="px-2 h-7 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors">
        {tieneFondo ? '🖼 Cambiar' : '🖼 Fondo'}
      </button>
      {tieneFondo && (
        <button onClick={onLimpiarFondo}
          className="px-2 h-7 bg-gray-700 hover:bg-gray-600 text-red-400 rounded transition-colors">
          Quitar
        </button>
      )}

      {/* Shift tip */}
      {(herramienta === 'line' || herramienta === 'vara') && (
        <span className="text-gray-600 hidden md:inline">Shift = recta</span>
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
// Generadores de objetos de plantilla
// ---------------------------------------------------------------------------
const GENERADORES = {
  vara_sola: (cx, cy) => [{
    id: generateId(), tipo: 'vara', esPlantilla: true,
    x1: cx - 200, y1: cy, x2: cx + 200, y2: cy,
    color: '#94a3b8', grosor: 3, etiqueta: 'Vara',
  }],

  foh: (cx, cy) => [{
    id: generateId(), tipo: 'line', esPlantilla: true,
    x1: cx - 300, y1: cy, x2: cx + 300, y2: cy,
    color: '#e2e8f0', grosor: 5,
  }],

  caja_escenario: (cx, cy) => [{
    id: generateId(), tipo: 'rect', esPlantilla: true,
    x1: cx - 300, y1: cy - 175, x2: cx + 300, y2: cy + 175,
    color: '#64748b', grosor: 3,
  }],

  proscenio: (cx, cy) => [{
    id: generateId(), tipo: 'line', esPlantilla: true,
    x1: cx - 300, y1: cy + 175, x2: cx + 300, y2: cy + 175,
    color: '#e2e8f0', grosor: 5,
  }],

  ciclorama: (cx, cy) => [{
    id: generateId(), tipo: 'line', esPlantilla: true,
    x1: cx - 300, y1: cy - 175, x2: cx + 300, y2: cy - 175,
    color: '#64748b', grosor: 4,
  }],

  escenario_completo: (cx, cy) => {
    const esc_w = 600, esc_h = 350
    return [
      { id: generateId(), tipo: 'rect', esPlantilla: true,
        x1: cx-esc_w/2, y1: cy-esc_h/2, x2: cx+esc_w/2, y2: cy+esc_h/2,
        color: '#64748b', grosor: 3 },
      { id: generateId(), tipo: 'line', esPlantilla: true,
        x1: cx-esc_w/2, y1: cy+esc_h/2, x2: cx+esc_w/2, y2: cy+esc_h/2,
        color: '#e2e8f0', grosor: 5 },
      { id: generateId(), tipo: 'text', esPlantilla: true,
        x1: cx-40, y1: cy+20, x2: cx-40, y2: cy+20,
        texto: 'ESCENARIO', color: '#64748b', grosor: 2 },
      { id: generateId(), tipo: 'vara', esPlantilla: true,
        x1: cx-esc_w/2+30, y1: cy-esc_h/2+60, x2: cx+esc_w/2-30, y2: cy-esc_h/2+60,
        color: '#94a3b8', grosor: 3, etiqueta: 'Vara 1' },
      { id: generateId(), tipo: 'vara', esPlantilla: true,
        x1: cx-esc_w/2+30, y1: cy-esc_h/2+160, x2: cx+esc_w/2-30, y2: cy-esc_h/2+160,
        color: '#94a3b8', grosor: 3, etiqueta: 'Vara 2' },
      { id: generateId(), tipo: 'vara', esPlantilla: true,
        x1: cx-esc_w/2-20, y1: cy+esc_h/2+60, x2: cx+esc_w/2+20, y2: cy+esc_h/2+60,
        color: '#94a3b8', grosor: 3, etiqueta: 'FOH' },
    ]
  },
}

// ---------------------------------------------------------------------------
// LightPlot — componente principal
// ---------------------------------------------------------------------------
export default function LightPlot({ project, onUpdate }) {
  const lightPlot  = project.lightPlot ?? createEmptyLightPlot()
  const luminarias = project.luminarias ?? []

  const [herramienta, setHerramienta]     = useState('select')
  const [zoom, setZoom]                   = useState(0.7)
  const [colorTrazo, setColorTrazo]       = useState('#94a3b8')
  const [mostrarGrid, setMostrarGrid]     = useState(true)
  const [snapActivo, setSnapActivo]       = useState(true)
  const [shiftActivo, setShiftActivo]     = useState(false)
  const [panelColapsado, setPanelColapsado] = useState(false)
  const [imagenFondoSesion, setImagenFondoSesion] = useState(null)

  // Selección: IDs (string). NO cambian durante el arrastre → inspector estable.
  const [selInst, setSelInst] = useState(null)
  const [selElem, setSelElem] = useState(null)

  // Dibujo en curso
  const [dibujando, setDibujando] = useState(null)

  // Arrastre — usa refs para no provocar re-renders durante el mousemove
  const arrastrando    = useRef(null) // { id, dx, dy, moved }
  const arrastandoElem = useRef(null) // { id, ox1,oy1,ox2,oy2, mx,my, moved }
  const pendienteCustom = useRef(null)
  const [pendienteCustomState, setPendienteCustomState] = useState(null)

  const svgRef      = useRef(null)
  const wrapperRef  = useRef(null)
  const fileInputRef = useRef(null)

  // ---------------------------------------------------------------------------
  // Atajos de teclado
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'Shift') { setShiftActivo(true); return }
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return
      const map = { v:'select', l:'line', r:'rect', p:'vara', t:'text' }
      if (map[e.key.toLowerCase()]) setHerramienta(map[e.key.toLowerCase()])
      if (e.key === 'Escape') { setSelInst(null); setSelElem(null) }
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selInst || selElem)) {
        e.preventDefault()
        if (selInst) handleEliminarInstancia(selInst)
        else if (selElem) handleEliminarElemento(selElem)
      }
      if ((e.key === '+' || e.key === '=') && !e.ctrlKey)
        setZoom((z) => Math.min(ZOOM_MAX, +(z+ZOOM_STEP).toFixed(2)))
      if (e.key === '-' && !e.ctrlKey)
        setZoom((z) => Math.max(ZOOM_MIN, +(z-ZOOM_STEP).toFixed(2)))
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
  // Coordenadas canvas (sin snap para el preview de dibujo; con snap para confirmar)
  // ---------------------------------------------------------------------------
  const toCanvas = useCallback((clientX, clientY, conSnap = false) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    let x = (clientX - rect.left) / zoom
    let y = (clientY - rect.top)  / zoom
    if (conSnap && snapActivo) { x = snapGrid(x, SNAP_SIZE); y = snapGrid(y, SNAP_SIZE) }
    return { x, y }
  }, [zoom, snapActivo])

  // ---------------------------------------------------------------------------
  // Zoom con rueda
  // ---------------------------------------------------------------------------
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z+delta).toFixed(2))))
  }, [])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // ---------------------------------------------------------------------------
  // Drag & Drop desde panel lateral
  // ---------------------------------------------------------------------------
  const handleDragStart = (e, lum) => e.dataTransfer.setData('lumId', lum.id)

  const colocarInstancia = useCallback((lum, pos, clave) => {
    if (lightPlot.instancias.some((i) => i.lumId === lum.id)) return
    const nueva = {
      id: generateId(), lumId: lum.id,
      x: pos.x, y: pos.y,
      rotacion: 0, escala: 1,
      simbolo: clave,
      canal: lum.numero, dimmer: '',
      proposito: lum.afoque || '',
      grupo: lum.nombreGrupo || '',
      notas: '',
    }
    persistir({ ...lightPlot, instancias: [...lightPlot.instancias, nueva] })
    setPendienteCustomState(null)
  }, [lightPlot, persistir])

  const handleDrop = (e) => {
    e.preventDefault()
    const lumId = e.dataTransfer.getData('lumId')
    if (!lumId) return
    const lum = luminarias.find((l) => l.id === lumId)
    if (!lum || lightPlot.instancias.some((i) => i.lumId === lum.id)) return
    const pos   = toCanvas(e.clientX, e.clientY, true)
    const clave = TIPO_A_SIMBOLO[lum.tipo]
    if (!clave) { setPendienteCustomState({ lum, pos }); return }
    colocarInstancia(lum, pos, clave)
  }

  const handleClickColocar = (lum) => {
    if (lightPlot.instancias.some((i) => i.lumId === lum.id)) return
    const rect = wrapperRef.current?.getBoundingClientRect()
    const scrollL = wrapperRef.current?.scrollLeft ?? 0
    const scrollT = wrapperRef.current?.scrollTop  ?? 0
    const cx = rect ? (rect.width  / 2 + scrollL) / zoom : CANVAS_W / 2
    const cy = rect ? (rect.height / 2 + scrollT) / zoom : CANVAS_H / 2
    const clave = TIPO_A_SIMBOLO[lum.tipo]
    if (!clave) { setPendienteCustomState({ lum, pos: { x: cx, y: cy } }); return }
    colocarInstancia(lum, { x: cx, y: cy }, clave)
  }

  // ---------------------------------------------------------------------------
  // MouseDown en instancia — registra inicio, sin setear arrastre todavía
  // ---------------------------------------------------------------------------
  const handleInstanciaMouseDown = (e, inst) => {
    if (herramienta !== 'select' || e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const pos = toCanvas(e.clientX, e.clientY)
    arrastrando.current = { id: inst.id, dx: pos.x - inst.x, dy: pos.y - inst.y, moved: false }
    // Selección inmediata al bajar el ratón — se cancela si resulta ser arrastre
    setSelElem(null)
    setSelInst(inst.id)
  }

  // ---------------------------------------------------------------------------
  // MouseDown en elemento estructural
  // ---------------------------------------------------------------------------
  const handleElemMouseDown = (e, elem) => {
    if (herramienta !== 'select' || e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const pos = toCanvas(e.clientX, e.clientY)
    arrastandoElem.current = {
      id: elem.id,
      ox1: elem.x1, oy1: elem.y1,
      ox2: elem.x2 ?? elem.x1, oy2: elem.y2 ?? elem.y1,
      mx: pos.x, my: pos.y,
      moved: false,
      esPlantilla: Boolean(elem.esPlantilla),
    }
    setSelInst(null)
    setSelElem(elem.id)
  }

  // ---------------------------------------------------------------------------
  // MouseDown en SVG (fondo) — deselecciona o inicia dibujo
  // ---------------------------------------------------------------------------
  const handleSvgMouseDown = (e) => {
    if (e.button !== 0) return

    if (herramienta === 'select') {
      // Click en fondo → deseleccionar
      setSelInst(null)
      setSelElem(null)
      return
    }

    const pos = toCanvas(e.clientX, e.clientY, true)
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
  // MouseMove — arrastre con umbral
  // ---------------------------------------------------------------------------
  const handleMouseMove = useCallback((e) => {
    // Arrastre de instancia
    if (arrastrando.current) {
      const pos = toCanvas(e.clientX, e.clientY, snapActivo)
      const nx  = pos.x - arrastrando.current.dx
      const ny  = pos.y - arrastrando.current.dy
      // Verificar umbral
      const inst = project.lightPlot?.instancias?.find((i) => i.id === arrastrando.current.id)
      if (inst) {
        const distancia = Math.sqrt((nx - inst.x)**2 + (ny - inst.y)**2)
        if (!arrastrando.current.moved && distancia < DRAG_UMBRAL) return
        arrastrando.current.moved = true
      }
      const nuevas = (project.lightPlot?.instancias ?? []).map((i) =>
        i.id === arrastrando.current.id ? { ...i, x: nx, y: ny } : i
      )
      onUpdate({ ...project, lightPlot: { ...project.lightPlot, instancias: nuevas } })
      return
    }

    // Arrastre de elemento — plantillas NO se redimensionan pero sí se mueven
    if (arrastandoElem.current) {
      const pos = toCanvas(e.clientX, e.clientY, snapActivo)
      const ddx = pos.x - arrastandoElem.current.mx
      const ddy = pos.y - arrastandoElem.current.my
      const dist = Math.sqrt(ddx**2 + ddy**2)
      if (!arrastandoElem.current.moved && dist < DRAG_UMBRAL) return
      arrastandoElem.current.moved = true
      const nuevos = (project.lightPlot?.elementos ?? []).map((el) =>
        el.id === arrastandoElem.current.id
          ? { ...el,
              x1: arrastandoElem.current.ox1 + ddx,
              y1: arrastandoElem.current.oy1 + ddy,
              x2: arrastandoElem.current.ox2 + ddx,
              y2: arrastandoElem.current.oy2 + ddy }
          : el
      )
      onUpdate({ ...project, lightPlot: { ...project.lightPlot, elementos: nuevos } })
      return
    }

    // Dibujo
    if (dibujando) {
      const raw = toCanvas(e.clientX, e.clientY)
      const { x2, y2 } = ortogonal(dibujando.x1, dibujando.y1, raw.x, raw.y, shiftActivo)
      const sx = snapActivo ? snapGrid(x2, SNAP_SIZE) : x2
      const sy = snapActivo ? snapGrid(y2, SNAP_SIZE) : y2
      setDibujando((prev) => ({ ...prev, x2: sx, y2: sy }))
    }
  }, [toCanvas, snapActivo, shiftActivo, dibujando, project, onUpdate])

  // ---------------------------------------------------------------------------
  // MouseUp — confirma arrastre o click
  // ---------------------------------------------------------------------------
  const handleMouseUp = useCallback(async () => {
    if (arrastrando.current) {
      if (arrastrando.current.moved) {
        // Persistir posición final
        await saveProject({ ...project, lightPlot: project.lightPlot })
      }
      // Si NO se movió fue un click — la selección ya fue seteada en mouseDown
      arrastrando.current = null
      return
    }
    if (arrastandoElem.current) {
      if (arrastandoElem.current.moved) {
        await saveProject({ ...project, lightPlot: project.lightPlot })
      }
      arrastandoElem.current = null
      return
    }
    if (dibujando && dibujando.x2 !== undefined) {
      const elem = { ...dibujando, id: generateId() }
      await persistir({ ...lightPlot, elementos: [...lightPlot.elementos, elem] })
      setDibujando(null)
    }
  }, [dibujando, lightPlot, project, persistir])

  // ---------------------------------------------------------------------------
  // Actualizar / eliminar instancias y elementos
  // ---------------------------------------------------------------------------
  const handleUpdateInstancia = useCallback((act) => {
    persistir({ ...lightPlot, instancias: lightPlot.instancias.map((i) => i.id === act.id ? act : i) })
  }, [lightPlot, persistir])

  const handleEliminarInstancia = useCallback((id) => {
    if (!confirm('¿Eliminar del plano? La luminaria volverá a estar disponible.')) return
    persistir({ ...lightPlot, instancias: lightPlot.instancias.filter((i) => i.id !== id) })
    setSelInst(null)
  }, [lightPlot, persistir])

  const handleUpdateElemento = useCallback((act) => {
    persistir({ ...lightPlot, elementos: lightPlot.elementos.map((e) => e.id === act.id ? act : e) })
  }, [lightPlot, persistir])

  const handleEliminarElemento = useCallback((id) => {
    persistir({ ...lightPlot, elementos: lightPlot.elementos.filter((e) => e.id !== id) })
    setSelElem(null)
  }, [lightPlot, persistir])

  const handleEliminarSeleccion = () => {
    if (selInst) handleEliminarInstancia(selInst)
    else if (selElem) handleEliminarElemento(selElem)
  }

  // ---------------------------------------------------------------------------
  // Plantilla
  // ---------------------------------------------------------------------------
  const handleInsertarPlantilla = (itemId) => {
    const gen = GENERADORES[itemId]
    if (!gen) return
    const cx = CANVAS_W / 2, cy = CANVAS_H / 2
    const nuevos = gen(cx, cy)
    persistir({ ...lightPlot, elementos: [...lightPlot.elementos, ...nuevos] })
  }

  // ---------------------------------------------------------------------------
  // Fondo sesión
  // ---------------------------------------------------------------------------
  const handleImportarFondo = () => fileInputRef.current?.click()
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setImagenFondoSesion(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ---------------------------------------------------------------------------
  // Render elementos estructurales
  // ---------------------------------------------------------------------------
  const renderElemento = (elem) => {
    const esSel  = elem.id === selElem
    const color  = esSel ? '#fe6732' : (elem.color || STROKE_STRUCT)
    const grosor = elem.grosor ?? 2

    const iProps = {
      key:         elem.id,
      onClick:     (e) => { e.stopPropagation(); if (herramienta === 'select') { setSelInst(null); setSelElem((p) => p === elem.id ? null : elem.id) } },
      onMouseDown: (e) => handleElemMouseDown(e, elem),
      style:       { cursor: herramienta === 'select' ? 'pointer' : 'default' },
    }

    if (elem.tipo === 'line') return (
      <g key={elem.id}>
        <line {...iProps} x1={elem.x1} y1={elem.y1} x2={elem.x2 ?? elem.x1} y2={elem.y2 ?? elem.y1}
          stroke="transparent" strokeWidth="14" />
        <line x1={elem.x1} y1={elem.y1} x2={elem.x2 ?? elem.x1} y2={elem.y2 ?? elem.y1}
          stroke={color} strokeWidth={grosor} style={{ pointerEvents: 'none' }} />
      </g>
    )

    if (elem.tipo === 'vara') {
      const x2e = elem.x2 ?? elem.x1, y2e = elem.y2 ?? elem.y1
      const dx = x2e - elem.x1, dy = y2e - elem.y1
      const len = Math.sqrt(dx*dx + dy*dy) || 1
      const nx = -dy/len, ny = dx/len, t = 12
      const mx = (elem.x1 + x2e) / 2, my = (elem.y1 + y2e) / 2
      return (
        <g key={elem.id} {...iProps}>
          <line x1={elem.x1} y1={elem.y1} x2={x2e} y2={y2e} stroke="transparent" strokeWidth="16" />
          <line x1={elem.x1} y1={elem.y1} x2={x2e} y2={y2e} stroke={color} strokeWidth={grosor+2} style={{ pointerEvents: 'none' }} />
          <line x1={elem.x1+nx*t} y1={elem.y1+ny*t} x2={elem.x1-nx*t} y2={elem.y1-ny*t} stroke={color} strokeWidth={grosor} style={{ pointerEvents: 'none' }} />
          <line x1={x2e+nx*t} y1={y2e+ny*t} x2={x2e-nx*t} y2={y2e-ny*t} stroke={color} strokeWidth={grosor} style={{ pointerEvents: 'none' }} />
          {elem.etiqueta && (
            <text x={mx} y={my-12} textAnchor="middle" fontSize="12" fontFamily="sans-serif"
              fill={color} style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {elem.etiqueta}
            </text>
          )}
          {/* Indicador visual de plantilla */}
          {elem.esPlantilla && esSel && (
            <rect x={elem.x1+nx*t} y={elem.y1+ny*t-2} width={Math.abs(x2e-elem.x1)} height={4}
              fill="none" stroke="#fe6732" strokeWidth="1" strokeDasharray="6,4"
              style={{ pointerEvents: 'none' }} />
          )}
        </g>
      )
    }

    if (elem.tipo === 'rect') {
      const x = Math.min(elem.x1, elem.x2 ?? elem.x1)
      const y = Math.min(elem.y1, elem.y2 ?? elem.y1)
      const w = Math.abs((elem.x2 ?? elem.x1) - elem.x1)
      const h = Math.abs((elem.y2 ?? elem.y1) - elem.y1)
      return (
        <g key={elem.id}>
          <rect {...iProps} x={x} y={y} width={w} height={h} fill="transparent" stroke="transparent" strokeWidth="10" />
          <rect x={x} y={y} width={w} height={h} fill="none" stroke={color} strokeWidth={grosor} style={{ pointerEvents: 'none' }} />
        </g>
      )
    }

    if (elem.tipo === 'text') {
      const fs = Math.max(12, (elem.grosor ?? 2) * 3 + 10)
      return (
        <text key={elem.id} {...iProps} x={elem.x1} y={elem.y1}
          fill={color} fontSize={fs} fontFamily="sans-serif">
          {elem.texto}
        </text>
      )
    }
    return null
  }

  // ---------------------------------------------------------------------------
  // Datos de selección
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
        onInsertarPlantilla={handleInsertarPlantilla}
      />

      <div className="flex flex-1 overflow-hidden">

        {/* Panel luminarias colapsable */}
        <PanelLuminarias
          luminarias={luminarias}
          instancias={lightPlot.instancias}
          lightPlot={lightPlot}
          onDragStart={handleDragStart}
          onClickColocar={handleClickColocar}
          colapsado={panelColapsado}
          setColapsado={setPanelColapsado}
        />

        {/* Canvas */}
        <div
          ref={wrapperRef}
          className="flex-1 overflow-auto bg-gray-950 relative"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: herramienta === 'select' ? 'default' : 'crosshair' }}
        >
          {imagenFondoSesion && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-amber-900/80 text-amber-200 text-xs px-3 py-1 rounded pointer-events-none">
              Imagen de fondo solo visible en esta sesión
            </div>
          )}

          <div className="p-8 inline-block">
            <svg
              ref={svgRef}
              width={CANVAS_W * zoom}
              height={CANVAS_H * zoom}
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              style={{
                display: 'block',
                background: '#111827',
                border: '3px solid #4b5563',
                boxShadow: '0 0 0 1px #1f2937, 0 4px 32px rgba(0,0,0,0.6)',
              }}
              onMouseDown={handleSvgMouseDown}
            >
              {/* Fondo sesión */}
              {imagenFondoSesion && (
                <image href={imagenFondoSesion} x="0" y="0"
                  width={CANVAS_W} height={CANVAS_H}
                  opacity="0.45" preserveAspectRatio="xMidYMid meet"
                  style={{ pointerEvents: 'none' }} />
              )}

              {/* Grid */}
              {mostrarGrid && (
                <>
                  <defs>
                    <pattern id="grid-minor" width={GRID_SIZE/2} height={GRID_SIZE/2} patternUnits="userSpaceOnUse">
                      <path d={`M ${GRID_SIZE/2} 0 L 0 0 0 ${GRID_SIZE/2}`} fill="none" stroke="#1f2937" strokeWidth="0.5"/>
                    </pattern>
                    <pattern id="grid-major" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                      <rect width={GRID_SIZE} height={GRID_SIZE} fill="url(#grid-minor)"/>
                      <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#374151" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width={CANVAS_W} height={CANVAS_H} fill="url(#grid-major)" style={{ pointerEvents: 'none' }} />
                </>
              )}

              {/* Elementos estructurales */}
              <g id="draw-layer">
                {lightPlot.elementos.map(renderElemento)}
                {dibujando?.x2 !== undefined && renderElemento({ ...dibujando, id: '__preview__' })}
              </g>

              {/* Símbolos */}
              <g id="sym-layer">
                {lightPlot.instancias.map((inst) => {
                  const lum   = luminarias.find((l) => l.id === inst.lumId)
                  const fill  = lum ? resolverColorLuminaria(lum) : COLOR_DEFAULT
                  const esSel = inst.id === selInst
                  const esc   = inst.escala ?? 1

                  return (
                    <g key={inst.id}
                      transform={`translate(${inst.x},${inst.y}) rotate(${inst.rotacion ?? 0})`}
                      onMouseDown={(e) => handleInstanciaMouseDown(e, inst)}
                      style={{ cursor: herramienta === 'select' ? 'pointer' : 'default' }}>

                      {/* Anillo de selección tipo Office — solo visual */}
                      {esSel && (
                        <circle r={36 * esc} fill="rgba(254,103,50,0.08)"
                          stroke="#fe6732" strokeWidth="1.5" strokeDasharray="5,3"
                          style={{ pointerEvents: 'none' }} />
                      )}

                      <SimboloSVG tipo={inst.simbolo} fill={fill} stroke={STROKE_SIM} scale={esc} />

                      {inst.canal != null && inst.canal !== '' && (
                        <text y={38 * esc} textAnchor="middle"
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

          {/* Indicador */}
          <div className="absolute bottom-3 right-3 text-xs text-gray-600 bg-gray-900/80 px-2 py-1 rounded pointer-events-none">
            {HERRAMIENTAS.find((h) => h.id === herramienta)?.label} · {Math.round(zoom * 100)}%
            {snapActivo && ' · Snap'}
          </div>
        </div>

        {/* Panel inspector derecho — SIEMPRE renderizado si hay selección, nunca se desmonta por arrastre */}
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
      {pendienteCustomState && (
        <SelectorSimbolo
          onSeleccionar={(c) => colocarInstancia(pendienteCustomState.lum, pendienteCustomState.pos, c)}
          onCancelar={() => setPendienteCustomState(null)}
        />
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  )
}