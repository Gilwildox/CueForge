// LightPlot v5 — integración de undo/redo/reset y nueva barra de herramientas
// Cambios respecto a v4:
// - BarraHerramientas rediseñada en dos filas fijas
// - Sistema de historial (100 estados máx.) con undo, redo y reset
// - Atajos Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z
// - El historial se guarda SOLO al finalizar un movimiento (mouseUp), no durante el drag
// - El resto del comportamiento es idéntico a v4

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
const GRID_STEP_DEFAULT = 25 // tamaño base de grid/snap (antes SNAP_SIZE fijo)
const GRID_STEP_MIN     = 10
const GRID_STEP_MAX     = 100
const GRID_STEP_INCR    = 5
const DRAG_UMBRAL   = 4   // px en coordenadas canvas antes de considerar arrastre
const HIST_MAX       = 100 // estados máximos en el historial
const OFFSET_DUPLICADO = 20 // desplazamiento en Y al duplicar un elemento estructural

const STROKE_SIM    = '#1a1a1a'
const STROKE_STRUCT = '#1a1a1a'

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
  { id: 'caja_escenario',     label: 'Caja de escenario',  desc: 'Solo el rectángulo del escenario' },
]

// ---------------------------------------------------------------------------
export const createEmptyLightPlot = () => ({
  instancias:      [],
  elementos:       [],
  symbolOverrides: {},
  typeDefaults:    {}, // { 'tipo_personalizado': { simbolo: 'clave', color: '#hex' } }
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
// SelectorSimbolo — además del símbolo, permite fijar un color por defecto
// para el tipo cuando la luminaria es de color variable (no aplica a fijo).
// ---------------------------------------------------------------------------
function SelectorSimbolo({ permiteColor, onSeleccionar, onCancelar }) {
  const [colorElegido, setColorElegido] = useState(COLOR_DEFAULT)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-5 w-80 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-white">¿Qué símbolo usar?</h3>
        <p className="text-xs text-gray-500 -mt-2">
          Se aplicará a todas las luminarias de este mismo tipo personalizado.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SIMBOLOS_DISPONIBLES.map((s) => {
            const Comp = SIMBOLOS_MAP[s.key]
            return (
              <button key={s.key} onClick={() => onSeleccionar(s.key, permiteColor ? colorElegido : null)}
                className="flex flex-col items-center gap-1 p-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors">
                <svg viewBox="-22 -34 44 68" width="40" height="60">
                  <Comp fill={permiteColor ? colorElegido : COLOR_DEFAULT} stroke="#ffffff" />
                </svg>
                <span className="text-xs text-gray-300 text-center leading-tight">{s.label}</span>
              </button>
            )
          })}
        </div>
        {permiteColor && (
          <div className="flex items-center gap-2 border-t border-gray-700 pt-3">
            <label className="text-xs text-gray-400">Color por defecto del tipo</label>
            <input type="color" value={colorElegido} onChange={(e) => setColorElegido(e.target.value)}
              className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent" />
          </div>
        )}
        <button onClick={onCancelar}
          className="self-end text-xs text-gray-500 hover:text-white transition-colors">Cancelar</button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PanelInspectorInstancia — drawer lateral FIJO, siempre montado cuando hay selección
// ---------------------------------------------------------------------------
function PanelInspectorInstancia({ instancia, luminaria, onUpdate, onEliminar, onCerrar }) {
  const [form, setForm] = useState({ ...instancia })

  // Sincronizar SOLO cuando cambia la instancia seleccionada (distinto id)
  useEffect(() => {
    setForm({ ...instancia })
  }, [instancia.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const cambiar = (campo, valor) => {
    const act = { ...form, [campo]: valor }
    setForm(act)
    onUpdate(act)
  }

  const fill = luminaria ? resolverColorLuminaria(luminaria, null, form) : COLOR_DEFAULT
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

      {/* Preview — fondo oscuro, stroke blanco para contraste */}
      <div className="flex justify-center items-center py-4 border-b border-gray-800 bg-gray-950 shrink-0">
        <svg viewBox="-22 -36 44 72" width="56" height="88">
          <Comp fill={fill} stroke="#ffffff" />
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

        {/* Color — solo para luminarias de color variable. En fijo el color
            viene de la mica y no se puede tocar aquí; en ninguno no aplica. */}
        {luminaria?.tipoColor === 'variable' && (
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-500">Color en el plano</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.colorOverride ?? fill}
                onChange={(e) => cambiar('colorOverride', e.target.value)}
                className="w-9 h-7 rounded cursor-pointer border-0 bg-transparent shrink-0" />
              <span className="text-xs text-gray-500">Ajuste manual para esta luminaria</span>
            </div>
          </div>
        )}

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
// ---------------------------------------------------------------------------
function PanelInspectorElemento({ elemento, onUpdate, onEliminar, onDuplicar, onCerrar }) {
  const tipoLabel = { line: 'Línea', rect: 'Rectángulo', vara: 'Vara / Percha', text: 'Texto' }

  const cx  = ((elemento.x1 ?? 0) + (elemento.x2 ?? elemento.x1 ?? 0)) / 2
  const cy  = ((elemento.y1 ?? 0) + (elemento.y2 ?? elemento.y1 ?? 0)) / 2
  const dx  = (elemento.x2 ?? elemento.x1 ?? 0) - (elemento.x1 ?? 0)
  const dy  = (elemento.y2 ?? elemento.y1 ?? 0) - (elemento.y1 ?? 0)
  const longitud  = Math.round(Math.sqrt(dx * dx + dy * dy))
  const anchoRect = Math.round(Math.abs(dx))
  const altoRect  = Math.round(Math.abs(dy))

  const cambiar = (campo, valor) => onUpdate({ ...elemento, [campo]: valor })

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

  const cambiarAncho = (nuevoAncho) => {
    if (nuevoAncho < 1) return
    const mitad = nuevoAncho / 2
    const yMin  = Math.min(elemento.y1 ?? 0, elemento.y2 ?? 0)
    const yMax  = Math.max(elemento.y1 ?? 0, elemento.y2 ?? 0)
    onUpdate({ ...elemento, x1: cx - mitad, x2: cx + mitad, y1: yMin, y2: yMax })
  }

  const cambiarAlto = (nuevoAlto) => {
    if (nuevoAlto < 1) return
    const mitad = nuevoAlto / 2
    const xMin  = Math.min(elemento.x1 ?? 0, elemento.x2 ?? 0)
    const xMax  = Math.max(elemento.x1 ?? 0, elemento.x2 ?? 0)
    onUpdate({ ...elemento, x1: xMin, x2: xMax, y1: cy - mitad, y2: cy + mitad })
  }

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

        <div className="flex gap-2 mt-1">
          <button onClick={onDuplicar}
            className="flex-1 text-xs text-amber-400 hover:text-amber-300 border border-amber-900 hover:border-amber-700 rounded py-1.5 transition-colors">
            Duplicar
          </button>
          <button onClick={onEliminar}
            className="flex-1 text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 rounded py-1.5 transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PanelInspectorMultiple — edición en bloque de varias LUMINARIAS seleccionadas
// (los elementos estructurales en selección múltiple solo se mueven, no
// muestran panel — ver nota en handleEliminarSeleccion/handleSvgMouseUp).
// Solo permite editar los campos que TODAS las instancias tienen en común:
//   - Rotación y escala: siempre editables (se aplican a todas por igual).
//   - Símbolo: solo si todas comparten actualmente el mismo símbolo.
//   - Color en el plano: solo si TODAS las luminarias correspondientes son
//     de tipoColor "variable".
// ---------------------------------------------------------------------------
function PanelInspectorMultiple({ instancias, luminarias, onUpdateBatch, onEliminar, onCerrar }) {
  const lumsSel = instancias
    .map((inst) => luminarias.find((l) => l.id === inst.lumId))
    .filter(Boolean)

  const simboloComun = instancias.length > 0 && instancias.every((i) => i.simbolo === instancias[0].simbolo)
    ? instancias[0].simbolo
    : null

  const colorEditable = lumsSel.length === instancias.length && lumsSel.length > 0
    && lumsSel.every((l) => l.tipoColor === 'variable')

  const colorComun = instancias.length > 0 && instancias.every(
    (i) => (i.colorOverride ?? COLOR_DEFAULT) === (instancias[0].colorOverride ?? COLOR_DEFAULT)
  ) ? (instancias[0].colorOverride ?? COLOR_DEFAULT) : COLOR_DEFAULT

  const escalaComun = instancias.length > 0 && instancias.every(
    (i) => (i.escala ?? 1) === (instancias[0].escala ?? 1)
  ) ? (instancias[0].escala ?? 1) : null

  return (
    <div className="w-56 bg-gray-900 border-l border-gray-700 flex flex-col overflow-hidden shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 shrink-0 bg-gray-800">
        <span className="text-xs font-semibold text-white truncate">
          {instancias.length} luminarias seleccionadas
        </span>
        <button onClick={onCerrar}
          className="text-gray-400 hover:text-white text-xl leading-none ml-2 shrink-0">×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
        <p className="text-xs text-gray-600">
          Solo se muestran los campos que estas luminarias tienen en común.
        </p>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Rotación (aplicar a todas)</label>
          <div className="flex gap-1 flex-wrap">
            {[0, 45, 90, 135, 180, 270].map((deg) => (
              <button key={deg} onClick={() => onUpdateBatch({ rotacion: deg })}
                className="px-1.5 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors">
                {deg}°
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-500">
            Escala {escalaComun ? `: ${escalaComun.toFixed(1)}×` : '(valores distintos)'}
          </label>
          <input type="range" min="0.3" max="3.0" step="0.1"
            defaultValue={escalaComun ?? 1}
            onChange={(e) => onUpdateBatch({ escala: Number(e.target.value) })}
            className="accent-amber-500" />
        </div>

        {simboloComun && (
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-500">Símbolo (todas comparten este)</label>
            <select value={simboloComun}
              onChange={(e) => onUpdateBatch({ simbolo: e.target.value })}
              className="bg-gray-800 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500">
              {SIMBOLOS_DISPONIBLES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        {colorEditable && (
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-500">Color en el plano (aplicar a todas)</label>
            <input type="color" defaultValue={colorComun}
              onChange={(e) => onUpdateBatch({ colorOverride: e.target.value })}
              className="w-full h-8 rounded cursor-pointer border-0" />
          </div>
        )}

        <button onClick={onEliminar}
          className="w-full text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 rounded py-1.5 transition-colors mt-1">
          Eliminar {instancias.length} del plano
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PanelLuminarias — colapsable, ítems en plano al fondo
// ---------------------------------------------------------------------------
function PanelLuminarias({ luminarias, instancias, lightPlot, onDragStart, onClickColocar, colapsado, setColapsado }) {
  const enPlano     = new Set(instancias.map((i) => i.lumId))
  const disponibles = [...luminarias]
    .filter((l) => !enPlano.has(l.id))
    .sort((a, b) => Number(a.numero) - Number(b.numero))
  const enPlanoLista = [...luminarias]
    .filter((l) => enPlano.has(l.id))
    .sort((a, b) => Number(a.numero) - Number(b.numero))

  return (
    <div className={`flex flex-col overflow-hidden transition-all duration-200 ${colapsado ? 'w-10' : 'w-48'} bg-gray-900 border-r border-gray-700 shrink-0`}>
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
              {disponibles.map((lum) => (
                <ItemLuminaria key={lum.id} lum={lum} enPlano={false}
                  lightPlot={lightPlot}
                  onDragStart={onDragStart} onClickColocar={onClickColocar} />
              ))}
              {enPlanoLista.length > 0 && (
                <div className="px-2 py-1 mt-1 border-t border-gray-800">
                  <p className="text-xs text-gray-600 uppercase tracking-wider">En plano</p>
                </div>
              )}
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
  const fill  = resolverColorLuminaria(lum, lightPlot)
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
// BarraHerramientas — dos filas fijas para evitar saltos de línea
// Fila 1: herramientas de dibujo + borrar + color + grid/snap + zoom
// Fila 2: plantilla + fondo + undo/redo + reset plano
// ---------------------------------------------------------------------------
function BarraHerramientas({
  herramienta, setHerramienta,
  zoom, setZoom,
  colorTrazo, setColorTrazo,
  mostrarGrid, setMostrarGrid,
  snapActivo, setSnapActivo,
  gridStep, setGridStep,
  marcoActivo, setMarcoActivo,
  tieneFondo, onImportarFondo, onLimpiarFondo,
  haySeleccion, onEliminarSeleccion,
  onInsertarPlantilla,
  puedeDeshacer, puedeRehacer, onDeshacer, onRehacer,
  onResetPlano,
}) {
  const [menuPlantillaAbierto, setMenuPlantillaAbierto] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <div className="bg-gray-800 border-b border-gray-700 shrink-0 text-xs">
      {/* --- FILA 1 --- */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-700/50">
        {/* Herramientas de dibujo */}
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
        <button onClick={onEliminarSeleccion} disabled={!haySeleccion}
          className={`px-2 h-7 rounded transition-colors
            ${haySeleccion
              ? 'bg-red-900/60 hover:bg-red-800 text-red-300'
              : 'bg-gray-700/40 text-gray-600 cursor-not-allowed'}`}>
          🗑 Borrar
        </button>

        <div className="w-px h-5 bg-gray-700" />

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

        {/* Tamaño de grid/snap */}
        <div className="flex items-center gap-0.5">
          <button onClick={() => setGridStep((s) => Math.max(GRID_STEP_MIN, s - GRID_STEP_INCR))}
            title="Reducir tamaño de grid/snap"
            className="w-6 h-7 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded flex items-center justify-center">−</button>
          <span className="text-gray-500 w-6 text-center">{gridStep}</span>
          <button onClick={() => setGridStep((s) => Math.min(GRID_STEP_MAX, s + GRID_STEP_INCR))}
            title="Aumentar tamaño de grid/snap"
            className="w-6 h-7 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded flex items-center justify-center">+</button>
        </div>

        <div className="w-px h-5 bg-gray-700" />

        {/* Multiselección por marco — modo opt-in, arrastrar sobre el lienzo
            selecciona varios elementos en vez de limpiar la selección */}
        <button onClick={() => setMarcoActivo((v) => !v)}
          title="Multiselección: arrastra sobre el lienzo para seleccionar varios elementos"
          className={`px-2 h-7 rounded transition-colors ${marcoActivo ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
          ⬚ Multiselección
        </button>

        {/* Shift tip */}
        {(herramienta === 'line' || herramienta === 'vara') && (
          <span className="text-gray-600 hidden lg:inline">Shift = recta</span>
        )}

        {/* Zoom — derecha */}
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

      {/* --- FILA 2 --- */}
      <div className="flex items-center gap-2 px-3 py-1">
        {/* Plantilla */}
        <div className="relative">
          <button onClick={() => setMenuPlantillaAbierto((v) => !v)}
            className="px-2 h-6 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors flex items-center gap-1">
            🎭 Plantilla ▾
          </button>
          {menuPlantillaAbierto && (
            <MenuPlantilla
              onInsertar={onInsertarPlantilla}
              onCerrar={() => setMenuPlantillaAbierto(false)}
            />
          )}
        </div>

        <div className="w-px h-4 bg-gray-700" />

        {/* Fondo */}
        <button onClick={onImportarFondo}
          className="px-2 h-6 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors">
          {tieneFondo ? '🖼 Cambiar fondo' : '🖼 Importar plano'}
        </button>
        {tieneFondo && (
          <button onClick={onLimpiarFondo}
            className="px-2 h-6 bg-gray-700 hover:bg-gray-600 text-red-400 rounded transition-colors">
            Quitar
          </button>
        )}

        <div className="w-px h-4 bg-gray-700" />

        {/* Deshacer / Rehacer */}
        <button onClick={onDeshacer} disabled={!puedeDeshacer}
          title="Deshacer [Ctrl+Z]"
          className={`px-2 h-6 rounded transition-colors
            ${puedeDeshacer
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              : 'bg-gray-700/40 text-gray-600 cursor-not-allowed'}`}>
          ↩ Deshacer
        </button>
        <button onClick={onRehacer} disabled={!puedeRehacer}
          title="Rehacer [Ctrl+Y]"
          className={`px-2 h-6 rounded transition-colors
            ${puedeRehacer
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              : 'bg-gray-700/40 text-gray-600 cursor-not-allowed'}`}>
          ↪ Rehacer
        </button>

        <div className="w-px h-4 bg-gray-700" />

        {/* Reset del plano */}
        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)}
            className="px-2 h-6 bg-gray-700 hover:bg-red-900/60 text-gray-400 hover:text-red-300 rounded transition-colors">
            ⊗ Limpiar plano
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-red-950/60 border border-red-800 rounded px-2 py-0.5">
            <span className="text-red-300">¿Borrar TODO el plano?</span>
            <button onClick={() => { onResetPlano(); setConfirmReset(false) }}
              className="px-2 h-5 bg-red-700 hover:bg-red-600 text-white rounded transition-colors font-semibold">
              Sí, borrar
            </button>
            <button onClick={() => setConfirmReset(false)}
              className="px-2 h-5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors">
              Cancelar
            </button>
          </div>
        )}
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

  const [herramienta, setHerramienta]       = useState('select')
  const [zoom, setZoom]                     = useState(0.7)
  const [colorTrazo, setColorTrazo]         = useState('#1a1a1a')
  const [mostrarGrid, setMostrarGrid]       = useState(true)
  const [snapActivo, setSnapActivo]         = useState(true)
  const [gridStep, setGridStep]             = useState(GRID_STEP_DEFAULT)
  const [shiftActivo, setShiftActivo]       = useState(false)
  const [panelColapsado, setPanelColapsado] = useState(false)
  const [imagenFondoSesion, setImagenFondoSesion] = useState(null)

  // Selección — arreglos de IDs para permitir selección múltiple
  const [selInsts, setSelInsts] = useState([]) // instancias de luminaria
  const [selElems, setSelElems] = useState([]) // elementos estructurales (línea, rect, vara, texto)

  // Selección por marco (rectángulo)
  const [marcoActivo, setMarcoActivo] = useState(false)
  const [marcoDibujando, setMarcoDibujando] = useState(null) // {x1,y1,x2,y2} rectángulo visual
  const marcoDragRef = useRef(null) // {x1,y1,aditivo} mientras se arrastra el marco

  // Dibujo en curso
  const [dibujando, setDibujando] = useState(null)

  // ---------------------------------------------------------------------------
  // Historial: pila de estados anteriores y futuros.
  // Cada entrada es una instantánea del lightPlot completo (instancias + elementos).
  // Se guarda SOLO al finalizar una acción (mouseUp, persistir), no durante el drag.
  // ---------------------------------------------------------------------------
  const historialPasado  = useRef([]) // estados anteriores (más antiguo primero)
  const historialFuturo  = useRef([]) // estados siguientes (para redo)

  // Snapshot del lightPlot actual antes de aplicar un cambio.
  // Se llama con el estado ANTES del cambio para que Undo lo restaure.
  const empujarHistorial = useCallback((estadoAnterior) => {
    historialPasado.current = [
      ...historialPasado.current.slice(-(HIST_MAX - 1)),
      estadoAnterior,
    ]
    // Cualquier acción nueva limpia el futuro (no más redo tras actuar)
    historialFuturo.current = []
  }, [])

  // Indica si hay estados disponibles (para habilitar/deshabilitar botones)
  const [puedeDeshacer, setPuedeDeshacer] = useState(false)
  const [puedeRehacer,  setPuedeRehacer]  = useState(false)

  // Sincroniza los flags de undo/redo con las pilas de historial
  const sincronizarFlags = useCallback(() => {
    setPuedeDeshacer(historialPasado.current.length > 0)
    setPuedeRehacer(historialFuturo.current.length > 0)
  }, [])

  // ---------------------------------------------------------------------------
  // Arrastre — refs para no provocar re-renders durante mousemove
  // ---------------------------------------------------------------------------
  const arrastrando     = useRef(null) // { id, dx, dy, moved, snapshotAntes }
  const arrastandoElem  = useRef(null) // { id, ox1,oy1,ox2,oy2, mx,my, moved, snapshotAntes }
  const pendienteCustom = useRef(null)
  const [pendienteCustomState, setPendienteCustomState] = useState(null)

  const svgRef       = useRef(null)
  const wrapperRef   = useRef(null)
  const fileInputRef = useRef(null)

  // ---------------------------------------------------------------------------
  // persistir — guarda el nuevo lightPlot en el proyecto y en IndexedDB.
  // empuja el historial con el estado ANTERIOR al cambio.
  // ---------------------------------------------------------------------------
  const persistir = useCallback(async (nuevoLP, estadoAnteriorParaHistorial) => {
    if (estadoAnteriorParaHistorial !== undefined) {
      empujarHistorial(estadoAnteriorParaHistorial)
      sincronizarFlags()
    }
    const act = { ...project, lightPlot: nuevoLP }
    onUpdate(act)
    await saveProject(act)
  }, [project, onUpdate, empujarHistorial, sincronizarFlags])

  // ---------------------------------------------------------------------------
  // Undo
  // ---------------------------------------------------------------------------
  const handleDeshacer = useCallback(async () => {
    if (historialPasado.current.length === 0) return
    const estadoAnterior = historialPasado.current[historialPasado.current.length - 1]
    historialPasado.current = historialPasado.current.slice(0, -1)
    // Guarda el estado actual en el futuro antes de restaurar
    historialFuturo.current = [...historialFuturo.current, lightPlot]
    sincronizarFlags()
    const act = { ...project, lightPlot: estadoAnterior }
    onUpdate(act)
    await saveProject(act)
    setSelInsts([])
    setSelElems([])
  }, [lightPlot, project, onUpdate, sincronizarFlags])

  // ---------------------------------------------------------------------------
  // Redo
  // ---------------------------------------------------------------------------
  const handleRehacer = useCallback(async () => {
    if (historialFuturo.current.length === 0) return
    const estadoSiguiente = historialFuturo.current[historialFuturo.current.length - 1]
    historialFuturo.current = historialFuturo.current.slice(0, -1)
    historialPasado.current = [...historialPasado.current, lightPlot]
    sincronizarFlags()
    const act = { ...project, lightPlot: estadoSiguiente }
    onUpdate(act)
    await saveProject(act)
    setSelInsts([])
    setSelElems([])
  }, [lightPlot, project, onUpdate, sincronizarFlags])

  // ---------------------------------------------------------------------------
  // Reset del plano
  // ---------------------------------------------------------------------------
  const handleResetPlano = useCallback(async () => {
    const vacio = createEmptyLightPlot()
    await persistir(vacio, lightPlot)
    sincronizarFlags()
    setSelInsts([])
    setSelElems([])
  }, [lightPlot, persistir, sincronizarFlags])

  // ---------------------------------------------------------------------------
  // Atajos de teclado
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'Shift') { setShiftActivo(true); return }

      // Undo/Redo — se procesan aunque el foco esté en un input
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          if (e.shiftKey) {
            e.preventDefault(); handleRehacer(); return
          }
          e.preventDefault(); handleDeshacer(); return
        }
        if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault(); handleRehacer(); return
        }
      }

      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return
      const map = { v:'select', l:'line', r:'rect', p:'vara', t:'text' }
      if (map[e.key.toLowerCase()]) setHerramienta(map[e.key.toLowerCase()])
      if (e.key === 'Escape') {
        setSelInsts([])
        setSelElems([])
        marcoDragRef.current = null
        setMarcoDibujando(null)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selInsts.length > 0 || selElems.length > 0)) {
        e.preventDefault()
        if (selInsts.length > 0) handleEliminarInstancias(selInsts)
        else if (selElems.length > 0) handleEliminarElementos(selElems)
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
  }, [selInsts, selElems, handleDeshacer, handleRehacer])

  // ---------------------------------------------------------------------------
  // Coordenadas canvas
  // ---------------------------------------------------------------------------
  const toCanvas = useCallback((clientX, clientY, conSnap = false) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    let x = (clientX - rect.left) / zoom
    let y = (clientY - rect.top)  / zoom
    if (conSnap && snapActivo) { x = snapGrid(x, gridStep); y = snapGrid(y, gridStep) }
    return { x, y }
  }, [zoom, snapActivo, gridStep])

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

  const colocarInstancia = useCallback((lum, pos, clave, colorOverride) => {
    if (lightPlot.instancias.some((i) => i.lumId === lum.id)) return
    const nueva = {
      id: generateId(), lumId: lum.id,
      x: pos.x, y: pos.y,
      rotacion: 0, escala: 1,
      simbolo: clave,
      ...(colorOverride ? { colorOverride } : {}),
      canal: lum.numero, dimmer: '',
      proposito: lum.afoque || '',
      grupo: lum.nombreGrupo || '',
      notas: '',
    }
    persistir(
      { ...lightPlot, instancias: [...lightPlot.instancias, nueva] },
      lightPlot // estado anterior para historial
    )
    setPendienteCustomState(null)
    sincronizarFlags()
  }, [lightPlot, persistir, sincronizarFlags])

  // Cuando el usuario elige símbolo (y color, si aplica) para un tipo personalizado
  // por primera vez, se guarda en typeDefaults para que las siguientes luminarias
  // del mismo tipo lo hereden automáticamente sin volver a preguntar.
  const colocarConDefaultDeTipo = useCallback((lum, pos, clave, colorElegido) => {
    if (lightPlot.instancias.some((i) => i.lumId === lum.id)) return
    const colorParaInstancia = lum.tipoColor === 'variable' ? colorElegido : null
    const nuevoTypeDefault = {
      simbolo: clave,
      ...(colorParaInstancia ? { color: colorParaInstancia } : {}),
    }
    const nueva = {
      id: generateId(), lumId: lum.id,
      x: pos.x, y: pos.y,
      rotacion: 0, escala: 1,
      simbolo: clave,
      ...(colorParaInstancia ? { colorOverride: colorParaInstancia } : {}),
      canal: lum.numero, dimmer: '',
      proposito: lum.afoque || '',
      grupo: lum.nombreGrupo || '',
      notas: '',
    }
    persistir(
      {
        ...lightPlot,
        typeDefaults: { ...lightPlot.typeDefaults, [lum.tipo]: nuevoTypeDefault },
        instancias: [...lightPlot.instancias, nueva],
      },
      lightPlot
    )
    setPendienteCustomState(null)
    sincronizarFlags()
  }, [lightPlot, persistir, sincronizarFlags])

  // Resuelve el símbolo/color ya guardados para el tipo, si existen
  const resolverDefaultDeTipo = (lum) => lightPlot.typeDefaults?.[lum.tipo]

  const handleDrop = (e) => {
    e.preventDefault()
    const lumId = e.dataTransfer.getData('lumId')
    if (!lumId) return
    const lum = luminarias.find((l) => l.id === lumId)
    if (!lum || lightPlot.instancias.some((i) => i.lumId === lum.id)) return
    const pos   = toCanvas(e.clientX, e.clientY, true)
    const clave = TIPO_A_SIMBOLO[lum.tipo]
    if (clave) { colocarInstancia(lum, pos, clave); return }
    const porTipo = resolverDefaultDeTipo(lum)
    if (porTipo) { colocarInstancia(lum, pos, porTipo.simbolo, porTipo.color); return }
    setPendienteCustomState({ lum, pos })
  }

  const handleClickColocar = (lum) => {
    if (lightPlot.instancias.some((i) => i.lumId === lum.id)) return
    const rect   = wrapperRef.current?.getBoundingClientRect()
    const scrollL = wrapperRef.current?.scrollLeft ?? 0
    const scrollT = wrapperRef.current?.scrollTop  ?? 0
    const cx = rect ? (rect.width  / 2 + scrollL) / zoom : CANVAS_W / 2
    const cy = rect ? (rect.height / 2 + scrollT) / zoom : CANVAS_H / 2
    const clave = TIPO_A_SIMBOLO[lum.tipo]
    if (clave) { colocarInstancia(lum, { x: cx, y: cy }, clave); return }
    const porTipo = resolverDefaultDeTipo(lum)
    if (porTipo) { colocarInstancia(lum, { x: cx, y: cy }, porTipo.simbolo, porTipo.color); return }
    setPendienteCustomState({ lum, pos: { x: cx, y: cy } })
  }

  // ---------------------------------------------------------------------------
  // MouseDown en instancia
  // ---------------------------------------------------------------------------
  const handleInstanciaMouseDown = (e, inst) => {
    if (herramienta !== 'select' || e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const pos = toCanvas(e.clientX, e.clientY)
    const modificador = e.shiftKey || e.ctrlKey || e.metaKey

    let nuevaSeleccion
    if (modificador) {
      // Shift/Ctrl: agrega o quita esta instancia de la selección actual
      nuevaSeleccion = selInsts.includes(inst.id)
        ? selInsts.filter((id) => id !== inst.id)
        : [...selInsts, inst.id]
    } else {
      // Click simple sobre una instancia YA seleccionada: conserva el grupo
      // (para poder arrastrarlo junto). Click simple sobre una NO seleccionada:
      // colapsa la selección a esa sola.
      nuevaSeleccion = selInsts.includes(inst.id) ? selInsts : [inst.id]
    }

    setSelElems([])
    setSelInsts(nuevaSeleccion)

    if (nuevaSeleccion.length === 0) {
      arrastrando.current = null
      return
    }

    // Guarda snapshot del lightPlot y la posición inicial de cada instancia
    // seleccionada, para poder trasladarlas juntas como bloque rígido
    const posiciones = {}
    nuevaSeleccion.forEach((id) => {
      const i = lightPlot.instancias.find((x) => x.id === id)
      if (i) posiciones[id] = { x: i.x, y: i.y }
    })
    arrastrando.current = {
      ids: nuevaSeleccion,
      startMouse: pos,
      startPositions: posiciones,
      moved: false,
      snapshotAntes: JSON.parse(JSON.stringify(lightPlot)),
    }
  }

  // ---------------------------------------------------------------------------
  // MouseDown en elemento estructural — mismo patrón que instancias:
  // Shift/Ctrl agrega o quita de la selección; click simple sobre uno ya
  // seleccionado conserva el grupo para arrastrarlo junto.
  // ---------------------------------------------------------------------------
  const handleElemMouseDown = (e, elem) => {
    if (herramienta !== 'select' || e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const pos = toCanvas(e.clientX, e.clientY)
    const modificador = e.shiftKey || e.ctrlKey || e.metaKey

    let nuevaSeleccion
    if (modificador) {
      nuevaSeleccion = selElems.includes(elem.id)
        ? selElems.filter((id) => id !== elem.id)
        : [...selElems, elem.id]
    } else {
      nuevaSeleccion = selElems.includes(elem.id) ? selElems : [elem.id]
    }

    setSelInsts([])
    setSelElems(nuevaSeleccion)

    if (nuevaSeleccion.length === 0) {
      arrastandoElem.current = null
      return
    }

    const posiciones = {}
    nuevaSeleccion.forEach((id) => {
      const el = lightPlot.elementos.find((x) => x.id === id)
      if (el) posiciones[id] = { x1: el.x1, y1: el.y1, x2: el.x2 ?? el.x1, y2: el.y2 ?? el.y1 }
    })
    arrastandoElem.current = {
      ids: nuevaSeleccion,
      startPositions: posiciones,
      mx: pos.x, my: pos.y,
      moved: false,
      snapshotAntes: JSON.parse(JSON.stringify(lightPlot)),
    }
  }

  // ---------------------------------------------------------------------------
  // MouseDown en SVG (fondo)
  // ---------------------------------------------------------------------------
  const handleSvgMouseDown = (e) => {
    if (e.button !== 0) return

    if (herramienta === 'select') {
      if (marcoActivo) {
        // Modo marco activo: empieza a dibujar el rectángulo de selección
        // en vez de limpiar la selección actual
        const pos = toCanvas(e.clientX, e.clientY)
        marcoDragRef.current = { x1: pos.x, y1: pos.y, aditivo: e.shiftKey }
        setMarcoDibujando({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y })
        return
      }
      setSelInsts([])
      setSelElems([])
      return
    }

    const pos = toCanvas(e.clientX, e.clientY, true)
    if (['line', 'vara', 'rect'].includes(herramienta)) {
      setDibujando({ tipo: herramienta, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, color: colorTrazo, grosor: 2 })
    } else if (herramienta === 'text') {
      const texto = prompt('Texto:')
      if (texto?.trim()) {
        const elem = {
          id: generateId(), tipo: 'text',
          x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y,
          texto: texto.trim(), color: colorTrazo, grosor: 2,
        }
        persistir(
          { ...lightPlot, elementos: [...lightPlot.elementos, elem] },
          lightPlot
        )
        sincronizarFlags()
      }
    }
  }

  // ---------------------------------------------------------------------------
  // MouseMove — arrastre con umbral, sin guardar historial
  // ---------------------------------------------------------------------------
  const handleMouseMove = useCallback((e) => {
    // Marco de selección — actualiza el rectángulo visual mientras se arrastra
    if (marcoDragRef.current) {
      const pos = toCanvas(e.clientX, e.clientY)
      setMarcoDibujando({ x1: marcoDragRef.current.x1, y1: marcoDragRef.current.y1, x2: pos.x, y2: pos.y })
      return
    }

    // Arrastre de instancia(s) — traslada todas las seleccionadas como bloque rígido
    if (arrastrando.current) {
      const pos = toCanvas(e.clientX, e.clientY, snapActivo)
      const dx  = pos.x - arrastrando.current.startMouse.x
      const dy  = pos.y - arrastrando.current.startMouse.y

      if (!arrastrando.current.moved) {
        const distancia = Math.sqrt(dx ** 2 + dy ** 2)
        if (distancia < DRAG_UMBRAL) return
        arrastrando.current.moved = true
      }
      // Solo actualiza en memoria (onUpdate), no persiste en IndexedDB durante el drag
      const nuevas = (project.lightPlot?.instancias ?? []).map((i) => {
        const inicio = arrastrando.current.startPositions[i.id]
        if (!inicio) return i
        return { ...i, x: inicio.x + dx, y: inicio.y + dy }
      })
      onUpdate({ ...project, lightPlot: { ...project.lightPlot, instancias: nuevas } })
      return
    }

    // Arrastre de elemento(s) — traslada todos los seleccionados como bloque rígido
    if (arrastandoElem.current) {
      const pos = toCanvas(e.clientX, e.clientY, snapActivo)
      const ddx = pos.x - arrastandoElem.current.mx
      const ddy = pos.y - arrastandoElem.current.my
      const dist = Math.sqrt(ddx ** 2 + ddy ** 2)
      if (!arrastandoElem.current.moved && dist < DRAG_UMBRAL) return
      arrastandoElem.current.moved = true
      const nuevos = (project.lightPlot?.elementos ?? []).map((el) => {
        const inicio = arrastandoElem.current.startPositions[el.id]
        if (!inicio) return el
        return { ...el, x1: inicio.x1 + ddx, y1: inicio.y1 + ddy, x2: inicio.x2 + ddx, y2: inicio.y2 + ddy }
      })
      onUpdate({ ...project, lightPlot: { ...project.lightPlot, elementos: nuevos } })
      return
    }

    // Dibujo
    if (dibujando) {
      const raw = toCanvas(e.clientX, e.clientY)
      const { x2, y2 } = ortogonal(dibujando.x1, dibujando.y1, raw.x, raw.y, shiftActivo)
      const sx = snapActivo ? snapGrid(x2, gridStep) : x2
      const sy = snapActivo ? snapGrid(y2, gridStep) : y2
      setDibujando((prev) => ({ ...prev, x2: sx, y2: sy }))
    }
  }, [toCanvas, snapActivo, shiftActivo, dibujando, project, onUpdate])

  // ---------------------------------------------------------------------------
  // MouseUp — aquí SÍ se guarda el historial (fin del movimiento)
  // ---------------------------------------------------------------------------
  const handleMouseUp = useCallback(async () => {
    // Cierra el marco de selección y calcula qué elementos quedaron dentro
    // (instancias de luminaria y elementos estructurales, ambos por su punto
    // de referencia x1,y1 / x,y)
    if (marcoDragRef.current) {
      const { x1, y1, aditivo } = marcoDragRef.current
      const x2 = marcoDibujando?.x2 ?? x1
      const y2 = marcoDibujando?.y2 ?? y1
      const xMin = Math.min(x1, x2), xMax = Math.max(x1, x2)
      const yMin = Math.min(y1, y2), yMax = Math.max(y1, y2)
      const idsInstEnMarco = lightPlot.instancias
        .filter((i) => i.x >= xMin && i.x <= xMax && i.y >= yMin && i.y <= yMax)
        .map((i) => i.id)
      const idsElemEnMarco = lightPlot.elementos
        .filter((el) => el.x1 >= xMin && el.x1 <= xMax && el.y1 >= yMin && el.y1 <= yMax)
        .map((el) => el.id)
      setSelInsts((prev) => (aditivo ? [...new Set([...prev, ...idsInstEnMarco])] : idsInstEnMarco))
      setSelElems((prev) => (aditivo ? [...new Set([...prev, ...idsElemEnMarco])] : idsElemEnMarco))
      marcoDragRef.current = null
      setMarcoDibujando(null)
      return
    }
    if (arrastrando.current) {
      if (arrastrando.current.moved) {
        // Persiste la posición final Y empuja el historial con el snapshot de antes
        empujarHistorial(arrastrando.current.snapshotAntes)
        sincronizarFlags()
        await saveProject({ ...project, lightPlot: project.lightPlot })
      }
      arrastrando.current = null
      return
    }
    if (arrastandoElem.current) {
      if (arrastandoElem.current.moved) {
        empujarHistorial(arrastandoElem.current.snapshotAntes)
        sincronizarFlags()
        await saveProject({ ...project, lightPlot: project.lightPlot })
      }
      arrastandoElem.current = null
      return
    }
    if (dibujando && dibujando.x2 !== undefined) {
      const elem = { ...dibujando, id: generateId() }
      await persistir(
        { ...lightPlot, elementos: [...lightPlot.elementos, elem] },
        lightPlot
      )
      sincronizarFlags()
      setDibujando(null)
    }
  }, [dibujando, lightPlot, project, persistir, empujarHistorial, sincronizarFlags, marcoDibujando])

  // ---------------------------------------------------------------------------
  // Actualizar / eliminar instancias y elementos
  // Cada una de estas acciones empuja historial.
  // ---------------------------------------------------------------------------
  const handleUpdateInstancia = useCallback((act) => {
    persistir(
      { ...lightPlot, instancias: lightPlot.instancias.map((i) => i.id === act.id ? act : i) },
      lightPlot
    )
    sincronizarFlags()
  }, [lightPlot, persistir, sincronizarFlags])

  // Aplica los mismos cambios (rotación, escala, símbolo o color) a todas las
  // instancias actualmente seleccionadas. Usado por el panel multi-selección.
  const handleActualizarInstanciasBatch = useCallback((cambios) => {
    persistir(
      {
        ...lightPlot,
        instancias: lightPlot.instancias.map((i) =>
          selInsts.includes(i.id) ? { ...i, ...cambios } : i
        ),
      },
      lightPlot
    )
    sincronizarFlags()
  }, [lightPlot, persistir, sincronizarFlags, selInsts])

  const handleEliminarInstancias = useCallback((ids) => {
    const mensaje = ids.length > 1
      ? `¿Eliminar ${ids.length} luminarias del plano? Volverán a estar disponibles.`
      : '¿Eliminar del plano? La luminaria volverá a estar disponible.'
    if (!confirm(mensaje)) return
    persistir(
      { ...lightPlot, instancias: lightPlot.instancias.filter((i) => !ids.includes(i.id)) },
      lightPlot
    )
    sincronizarFlags()
    setSelInsts([])
  }, [lightPlot, persistir, sincronizarFlags])

  const handleUpdateElemento = useCallback((act) => {
    persistir(
      { ...lightPlot, elementos: lightPlot.elementos.map((e) => e.id === act.id ? act : e) },
      lightPlot
    )
    sincronizarFlags()
  }, [lightPlot, persistir, sincronizarFlags])

  // Duplica un elemento estructural (línea, rect, vara, texto) con un
  // pequeño desplazamiento en Y para evitar que quede exactamente encima
  // del original. Selecciona la copia resultante.
  const handleDuplicarElemento = useCallback((elem) => {
    const copia = {
      ...structuredClone(elem),
      id: generateId(),
      y1: (elem.y1 ?? 0) + OFFSET_DUPLICADO,
      y2: (elem.y2 ?? elem.y1 ?? 0) + OFFSET_DUPLICADO,
    }
    persistir(
      { ...lightPlot, elementos: [...lightPlot.elementos, copia] },
      lightPlot
    )
    sincronizarFlags()
    setSelInsts([])
    setSelElems([copia.id])
  }, [lightPlot, persistir, sincronizarFlags])

  const handleEliminarElementos = useCallback((ids) => {
    const mensaje = ids.length > 1 ? `¿Eliminar ${ids.length} elementos?` : '¿Eliminar este elemento?'
    if (!confirm(mensaje)) return
    persistir(
      { ...lightPlot, elementos: lightPlot.elementos.filter((e) => !ids.includes(e.id)) },
      lightPlot
    )
    sincronizarFlags()
    setSelElems([])
  }, [lightPlot, persistir, sincronizarFlags])

  const handleEliminarSeleccion = () => {
    if (selInsts.length > 0) handleEliminarInstancias(selInsts)
    else if (selElems.length > 0) handleEliminarElementos(selElems)
  }

  // ---------------------------------------------------------------------------
  // Plantilla
  // ---------------------------------------------------------------------------
  const handleInsertarPlantilla = (itemId) => {
    const gen = GENERADORES[itemId]
    if (!gen) return
    const cx = CANVAS_W / 2, cy = CANVAS_H / 2
    const nuevos = gen(cx, cy)
    persistir(
      { ...lightPlot, elementos: [...lightPlot.elementos, ...nuevos] },
      lightPlot
    )
    sincronizarFlags()
  }

  // ---------------------------------------------------------------------------
  // Fondo sesión (no persiste en IndexedDB, no entra al historial)
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
    const esSel  = selElems.includes(elem.id)
    const color  = esSel ? '#fe6732' : (elem.color || STROKE_STRUCT)
    const grosor = elem.grosor ?? 2

    const iProps = {
      key:         elem.id,
      onClick:     (e) => { e.stopPropagation() },
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
  const instSel = selInsts.length === 1
    ? lightPlot.instancias.find((i) => i.id === selInsts[0])
    : null
  const lumSel  = instSel ? luminarias.find((l) => l.id === instSel.lumId) : null
  const instanciasSeleccionadas = lightPlot.instancias.filter((i) => selInsts.includes(i.id))
  const elemSel = selElems.length === 1
    ? lightPlot.elementos.find((e) => e.id === selElems[0])
    : null
  const haySeleccion = selInsts.length > 0 || selElems.length > 0

  // ---------------------------------------------------------------------------
  // Bloqueo en dispositivos táctiles/pantallas estrechas — el editor depende
  // de mouse y drag&drop HTML5, que no funcionan de forma confiable en touch.
  // Se combinan dos señales para evitar falsos positivos/negativos de cada
  // una por separado:
  // - pointer: coarse → el dispositivo de entrada principal es táctil
  //   (detecta celulares y tablets reales; puede dar falso positivo en
  //   laptops convertibles con pantalla táctil, por eso no se usa solo)
  // - ancho de ventana < 1024px → pantalla pequeña típica de celular/tablet
  //   en vertical (puede dar falso positivo en laptops con zoom alto, por
  //   eso tampoco se usa solo)
  // Solo se bloquea cuando AMBAS señales coinciden: dispositivo táctil Y
  // pantalla estrecha. Una laptop convertible con mouse y pantalla grande
  // pasa; una tablet en horizontal grande también se bloquea si es touch.
  // ---------------------------------------------------------------------------
  const ANCHO_MINIMO = 1024
  const esPunteroTactil = typeof window !== 'undefined'
    && window.matchMedia?.('(pointer: coarse)').matches

  const [anchoVentana, setAnchoVentana] = useState(
    typeof window !== 'undefined' ? window.innerWidth : ANCHO_MINIMO
  )

  useEffect(() => {
    const onResize = () => setAnchoVentana(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const dispositivoNoApto = esPunteroTactil && anchoVentana < ANCHO_MINIMO

  if (dispositivoNoApto) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-6 py-20 gap-3"
        style={{ height: 'calc(100vh - 32px)' }}>
        <span className="text-3xl">🖥️</span>
        <h2 className="text-lg font-semibold text-white">El plano de iluminación requiere una pantalla más grande</h2>
        <p className="text-sm text-gray-400 max-w-sm">
          Este editor usa arrastre con mouse y no funciona de forma confiable en celular o tablet.
          Ábrelo desde una computadora para colocar y editar luminarias en el plano.
        </p>
      </div>
    )
  }

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
        gridStep={gridStep} setGridStep={setGridStep}
        marcoActivo={marcoActivo} setMarcoActivo={setMarcoActivo}
        tieneFondo={Boolean(imagenFondoSesion)}
        onImportarFondo={handleImportarFondo}
        onLimpiarFondo={() => setImagenFondoSesion(null)}
        haySeleccion={haySeleccion}
        onEliminarSeleccion={handleEliminarSeleccion}
        onInsertarPlantilla={handleInsertarPlantilla}
        puedeDeshacer={puedeDeshacer}
        puedeRehacer={puedeRehacer}
        onDeshacer={handleDeshacer}
        onRehacer={handleRehacer}
        onResetPlano={handleResetPlano}
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
                background: '#e8e8e8',
                border: '3px solid #9ca3af',
                boxShadow: '0 0 0 1px #6b7280, 0 4px 32px rgba(0,0,0,0.4)',
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
                    <pattern id="grid-minor" width={gridStep} height={gridStep} patternUnits="userSpaceOnUse">
                      <path d={`M ${gridStep} 0 L 0 0 0 ${gridStep}`} fill="none" stroke="#c8c8c8" strokeWidth="0.5"/>
                    </pattern>
                    <pattern id="grid-major" width={gridStep * 2} height={gridStep * 2} patternUnits="userSpaceOnUse">
                      <rect width={gridStep * 2} height={gridStep * 2} fill="url(#grid-minor)"/>
                      <path d={`M ${gridStep * 2} 0 L 0 0 0 ${gridStep * 2}`} fill="none" stroke="#b0b0b0" strokeWidth="1"/>
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
                  const fill  = lum ? resolverColorLuminaria(lum, lightPlot, inst) : COLOR_DEFAULT
                  const esSel = selInsts.includes(inst.id)
                  const esc   = inst.escala ?? 1

                  return (
                    <g key={inst.id}
                      transform={`translate(${inst.x},${inst.y}) rotate(${inst.rotacion ?? 0})`}
                      onMouseDown={(e) => handleInstanciaMouseDown(e, inst)}
                      style={{ cursor: herramienta === 'select' ? 'pointer' : 'default' }}>

                      {esSel && (
                        <circle r={36 * esc} fill="rgba(254,103,50,0.10)"
                          stroke="#fe6732" strokeWidth="1.5" strokeDasharray="5,3"
                          style={{ pointerEvents: 'none' }} />
                      )}

                      <SimboloSVG tipo={inst.simbolo} fill={fill} stroke={STROKE_SIM} scale={esc} />

                      {inst.canal != null && inst.canal !== '' && (
                        <text y={38 * esc} textAnchor="middle"
                          fontSize="12" fontFamily="sans-serif" fill="#1a1a1a"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}>
                          {inst.canal}
                        </text>
                      )}
                    </g>
                  )
                })}
              </g>

              {/* Rectángulo de selección por marco */}
              {marcoDibujando && (
                <rect
                  x={Math.min(marcoDibujando.x1, marcoDibujando.x2)}
                  y={Math.min(marcoDibujando.y1, marcoDibujando.y2)}
                  width={Math.abs(marcoDibujando.x2 - marcoDibujando.x1)}
                  height={Math.abs(marcoDibujando.y2 - marcoDibujando.y1)}
                  fill="rgba(254,103,50,0.08)" stroke="#fe6732" strokeWidth="1" strokeDasharray="4,3"
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </svg>
          </div>

          {/* Indicador */}
          <div className="absolute bottom-3 right-3 text-xs text-gray-600 bg-gray-900/80 px-2 py-1 rounded pointer-events-none">
            {HERRAMIENTAS.find((h) => h.id === herramienta)?.label} · {Math.round(zoom * 100)}%
            {snapActivo && ' · Snap'}
          </div>
        </div>

        {/* Paneles inspectores — siempre montados cuando hay selección.
            Nota: cuando hay 2+ elementos estructurales seleccionados, no se
            muestra panel — el marco solo permite moverlos juntos. */}
        {selInsts.length === 1 && instSel && lumSel && (
          <PanelInspectorInstancia
            key={instSel.id}
            instancia={instSel}
            luminaria={lumSel}
            onUpdate={handleUpdateInstancia}
            onEliminar={() => handleEliminarInstancias([instSel.id])}
            onCerrar={() => setSelInsts([])}
          />
        )}
        {selInsts.length > 1 && (
          <PanelInspectorMultiple
            key={selInsts.join(',')}
            instancias={instanciasSeleccionadas}
            luminarias={luminarias}
            onUpdateBatch={handleActualizarInstanciasBatch}
            onEliminar={() => handleEliminarInstancias(selInsts)}
            onCerrar={() => setSelInsts([])}
          />
        )}
        {elemSel && selInsts.length === 0 && selElems.length === 1 && (
          <PanelInspectorElemento
            key={elemSel.id}
            elemento={elemSel}
            onUpdate={handleUpdateElemento}
            onDuplicar={() => handleDuplicarElemento(elemSel)}
            onEliminar={() => handleEliminarElementos([elemSel.id])}
            onCerrar={() => setSelElems([])}
          />
        )}
      </div>

      {/* Modal selector símbolo custom */}
      {pendienteCustomState && (
        <SelectorSimbolo
          permiteColor={pendienteCustomState.lum.tipoColor === 'variable'}
          onSeleccionar={(c, color) => colocarConDefaultDeTipo(pendienteCustomState.lum, pendienteCustomState.pos, c, color)}
          onCancelar={() => setPendienteCustomState(null)}
        />
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  )
}