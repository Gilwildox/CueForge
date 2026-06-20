// Módulo 5 — Guion de iluminación
// Gestión completa de escenas: dictado, edición, búsqueda, filtros y paginación
import { useState, useRef, useMemo } from 'react'
import { saveProject } from '../../db/database'
import {
  generateId,
  siguienteNumeroCue,
  resolverIntensidad,
  resolverColor,
  resolverPosicion,
  calcularDeltas,
  calcularTodoACero,
} from '../../utils/helpers'

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------
const crearEscenaVacia = (numero, escenaAnterior) => ({
  id: generateId(),
  numero: String(numero),
  pie: '',
  nombre: '',
  tiempoEntrada: escenaAnterior?.tiempoEntrada ?? 0,
  tiempoSalida: escenaAnterior?.tiempoSalida ?? 0,
  tramoya: '',
  audio: '',
  videoEfectos: '',
  anotaciones: '',
  todoACero: false,
  estados: [],
})

const insertarEnOrden = (escenas, escenaNueva) => {
  const num = parseFloat(escenaNueva.numero)
  const idx = escenas.findIndex((e) => parseFloat(e.numero) > num)
  if (idx === -1) return [...escenas, escenaNueva]
  const copia = [...escenas]
  copia.splice(idx, 0, escenaNueva)
  return copia
}

const numeroDuplicado = (escenas, numero, idActual) =>
  escenas.some(
    (e) => parseFloat(e.numero) === parseFloat(numero) && e.id !== idActual
  )

// Calcula el flag todoACero en base al resultado real de intensidades.
// Se aplica tras insertar la escena en la lista, por eso recibe escenas ya con la nueva incluida.
const aplicarFlagTodoACero = (escenas, escenaId, luminarias) => {
  const idx = escenas.findIndex((e) => e.id === escenaId)
  if (idx === -1) return escenas
  const esCero = calcularTodoACero(escenas, idx, luminarias)
  return escenas.map((e) => e.id === escenaId ? { ...e, todoACero: esCero } : e)
}

// ---------------------------------------------------------------------------
// EtiquetaCue — encabezado editable
// ---------------------------------------------------------------------------
function EtiquetaCue({ valor, onGuardar }) {
  const [editando, setEditando] = useState(false)
  const [temp, setTemp] = useState(valor)
  const inputRef = useRef(null)

  const iniciar = () => { setTemp(valor); setEditando(true); setTimeout(() => inputRef.current?.focus(), 0) }
  const confirmar = () => { const l = temp.trim(); if (l) onGuardar(l); setEditando(false) }

  if (editando)
    return <input ref={inputRef} value={temp} onChange={(e) => setTemp(e.target.value)}
      onBlur={confirmar} onKeyDown={(e) => e.key === 'Enter' && confirmar()}
      className="bg-gray-700 text-white text-xs rounded px-1 py-0.5 w-20 focus:outline-none focus:ring-1 focus:ring-amber-500" />

  return <button onClick={iniciar} title="Click para editar la etiqueta"
    className="text-xs text-gray-500 uppercase tracking-wider hover:text-amber-400 transition-colors">
    {valor} ✎
  </button>
}

// ---------------------------------------------------------------------------
// SelectorColor
// ---------------------------------------------------------------------------
function SelectorColor({ valor, heredadoId, biblioteca, onCambio, onAgregarBiblioteca }) {
  const [modo, setModo] = useState('select')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoHex, setNuevoHex] = useState('#ffffff')

  const colorHeredado = heredadoId ? biblioteca.colores.find((c) => c.id === heredadoId) : null

  const confirmarNuevo = () => {
    if (!nuevoNombre.trim()) return
    const nuevo = { id: generateId(), nombre: nuevoNombre.trim(), hex: nuevoHex }
    onAgregarBiblioteca(nuevo)
    onCambio(nuevo.id)
    setModo('select'); setNuevoNombre(''); setNuevoHex('#ffffff')
  }

  if (modo === 'nuevo')
    return (
      <div className="flex items-center gap-1">
        <input type="color" value={nuevoHex} onChange={(e) => setNuevoHex(e.target.value)}
          className="w-7 h-6 rounded cursor-pointer bg-gray-700 border-0 shrink-0" />
        <input autoFocus type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && confirmarNuevo()} placeholder="Nombre..."
          className="w-20 bg-gray-700 text-white rounded px-1.5 py-0.5 text-xs placeholder-gray-500" />
        <button onClick={confirmarNuevo} className="text-xs text-amber-400 hover:text-amber-300">✓</button>
        <button onClick={() => setModo('select')} className="text-xs text-gray-500 hover:text-gray-300">✕</button>
      </div>
    )

  const colorActual = valor ? biblioteca.colores.find((c) => c.id === valor) : null

  return (
    <div className="flex items-center gap-1">
      {colorActual && (
        <span className="inline-block w-3 h-3 rounded-full border border-gray-600 shrink-0"
          style={{ backgroundColor: colorActual.hex }} />
      )}
      <select value={valor ?? ''} onChange={(e) => {
        if (e.target.value === '__nuevo__') { setModo('nuevo'); return }
        // null = hereda (no genera delta de color)
        onCambio(e.target.value === '' ? null : e.target.value)
      }} className={`flex-1 bg-gray-700 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 ${valor ? 'text-white' : 'text-gray-500'}`}>
        <option value="">{colorHeredado ? `↑ ${colorHeredado.nombre}` : '↑ Blanco'}</option>
        {biblioteca.colores.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        <option value="__nuevo__">+ Nuevo color...</option>
      </select>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SelectorPosicion
// ---------------------------------------------------------------------------
function SelectorPosicion({ valor, heredadoId, biblioteca, onCambio, onAgregarBiblioteca }) {
  const [modo, setModo] = useState('select')
  const [nuevaNombre, setNuevaNombre] = useState('')

  const posHeredada = heredadoId ? biblioteca.posiciones.find((p) => p.id === heredadoId) : null

  const confirmarNueva = () => {
    if (!nuevaNombre.trim()) return
    const nueva = { id: generateId(), nombre: nuevaNombre.trim() }
    onAgregarBiblioteca(nueva)
    onCambio(nueva.id)
    setModo('select'); setNuevaNombre('')
  }

  if (modo === 'nuevo')
    return (
      <div className="flex items-center gap-1">
        <input autoFocus type="text" value={nuevaNombre} onChange={(e) => setNuevaNombre(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && confirmarNueva()} placeholder="Nombre posición..."
          className="flex-1 bg-gray-700 text-white rounded px-1.5 py-0.5 text-xs placeholder-gray-500" />
        <button onClick={confirmarNueva} className="text-xs text-amber-400 hover:text-amber-300">✓</button>
        <button onClick={() => setModo('select')} className="text-xs text-gray-500 hover:text-gray-300">✕</button>
      </div>
    )

  return (
    <select value={valor ?? ''} onChange={(e) => {
      if (e.target.value === '__nuevo__') { setModo('nuevo'); return }
      onCambio(e.target.value === '' ? null : e.target.value)
    }} className={`w-full bg-gray-700 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 ${valor ? 'text-white' : 'text-gray-500'}`}>
      <option value="">{posHeredada ? `↑ ${posHeredada.nombre}` : '↑ Default'}</option>
      {biblioteca.posiciones.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      <option value="__nuevo__">+ Nueva posición...</option>
    </select>
  )
}

// ---------------------------------------------------------------------------
// FilaGrupoGuion — grupo colapsable en tabla del guion
// ---------------------------------------------------------------------------
function FilaGrupoGuion({
  grupoId, nombreGrupo, miembros, escenaActiva, setEscenaActiva,
  escenas, indiceAnterior, biblioteca, hayVariable, hayRobotica,
  onAgregarColor, onAgregarPosicion,
}) {
  const [expandido, setExpandido] = useState(false)

  const grupoTieneVariable = miembros.some((m) => m.tipoColor === 'variable')
  const grupoTieneRobotica = miembros.some((m) => m.esRobotica)

  const getEstadoMiembro = (lumId) =>
    escenaActiva.estados.find((e) => e.luminaria_id === lumId) ??
    { luminaria_id: lumId, intensidad: null, color_id: null, posicion_id: null }

  const getHeredado = (lumId, campo) => {
    if (indiceAnterior < 0) return campo === 'intensidad' ? 0 : null
    if (campo === 'intensidad') return resolverIntensidad(escenas, indiceAnterior, lumId)
    if (campo === 'color') return resolverColor(escenas, indiceAnterior, lumId)
    if (campo === 'posicion') return resolverPosicion(escenas, indiceAnterior, lumId)
    return null
  }

  const handleEstadoMiembro = (lumId, campo, valor) => {
    setEscenaActiva((prev) => {
      const existe = prev.estados.find((e) => e.luminaria_id === lumId)
      const nuevos = existe
        ? prev.estados.map((e) => e.luminaria_id === lumId ? { ...e, [campo]: valor } : e)
        : [...prev.estados, { luminaria_id: lumId, intensidad: null, color_id: null, posicion_id: null, [campo]: valor }]
      return { ...prev, estados: nuevos }
    })
  }

  const handleEstadoGrupo = (campo, valor) => {
    setEscenaActiva((prev) => {
      const ids = miembros.map((m) => m.id)
      const actualizados = prev.estados.map((e) =>
        ids.includes(e.luminaria_id) ? { ...e, [campo]: valor } : e
      )
      const idsConEstado = prev.estados.map((e) => e.luminaria_id)
      const nuevos = miembros
        .filter((m) => !idsConEstado.includes(m.id))
        .map((m) => ({ luminaria_id: m.id, intensidad: null, color_id: null, posicion_id: null, [campo]: valor }))
      return { ...prev, estados: [...actualizados, ...nuevos] }
    })
  }

  const primerEstado = getEstadoMiembro(miembros[0]?.id)
  const intGrupo = primerEstado.intensidad
  const colorGrupo = primerEstado.color_id
  const posGrupo = primerEstado.posicion_id
  const heredadoIntGrupo = getHeredado(miembros[0]?.id, 'intensidad')
  const heredadoColorGrupo = getHeredado(miembros[0]?.id, 'color')
  const heredadoPosGrupo = getHeredado(miembros[0]?.id, 'posicion')

  return (
    <>
      <tr className="border-b border-gray-700 bg-gray-800/60">
        <td className="py-1.5 px-2">
          <button onClick={() => setExpandido((v) => !v)}
            className="text-gray-500 hover:text-gray-300 text-xs w-4">
            {expandido ? '▾' : '▸'}
          </button>
        </td>
        <td className="py-1.5 pr-4">
          <span className="text-amber-300 text-xs font-medium">{nombreGrupo}</span>
          <span className="text-gray-600 text-xs ml-1.5">({miembros.length})</span>
        </td>
        <td className="py-1.5 pr-3">
          <input type="number" min={0} max={100}
            value={intGrupo ?? ''} placeholder={String(heredadoIntGrupo)}
            onChange={(e) => {
              const val = e.target.value === '' ? null : Math.min(100, Math.max(0, parseInt(e.target.value)))
              handleEstadoGrupo('intensidad', val)
            }}
            className="w-14 bg-gray-600 text-white rounded px-1.5 py-0.5 text-xs text-right placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
        </td>
        {hayVariable && (
          <td className="py-1.5 pr-3">
            {grupoTieneVariable
              ? <SelectorColor valor={colorGrupo} heredadoId={heredadoColorGrupo} biblioteca={biblioteca}
                  onCambio={(id) => handleEstadoGrupo('color_id', id)} onAgregarBiblioteca={onAgregarColor} />
              : <span className="text-gray-800 text-xs">—</span>}
          </td>
        )}
        {hayRobotica && (
          <td className="py-1.5">
            {grupoTieneRobotica
              ? <SelectorPosicion valor={posGrupo} heredadoId={heredadoPosGrupo} biblioteca={biblioteca}
                  onCambio={(id) => handleEstadoGrupo('posicion_id', id)} onAgregarBiblioteca={onAgregarPosicion} />
              : <span className="text-gray-800 text-xs">—</span>}
          </td>
        )}
      </tr>

      {expandido && miembros.map((lum) => {
        const estado = getEstadoMiembro(lum.id)
        const heredadoInt = getHeredado(lum.id, 'intensidad')
        const heredadoColor = getHeredado(lum.id, 'color')
        const heredadoPos = getHeredado(lum.id, 'posicion')

        return (
          <tr key={lum.id} className="border-b border-gray-800 bg-gray-900/40 hover:bg-gray-800/20">
            <td className="py-1 px-2">
              <span className="text-gray-600 text-xs pl-1">└</span>
            </td>
            <td className="py-1 pr-4">
              <span className="text-gray-500 font-mono text-xs mr-1.5">{lum.numero}</span>
              <span className="text-gray-300 text-xs">{lum.nombre}</span>
            </td>
            <td className="py-1 pr-3">
              <input type="number" min={0} max={100}
                value={estado.intensidad ?? ''}
                placeholder={String(estado.intensidad === null ? (intGrupo ?? heredadoInt) : '')}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : Math.min(100, Math.max(0, parseInt(e.target.value)))
                  handleEstadoMiembro(lum.id, 'intensidad', val)
                }}
                className="w-14 bg-gray-700 text-white rounded px-1.5 py-0.5 text-xs text-right placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </td>
            {hayVariable && (
              <td className="py-1 pr-3">
                {lum.tipoColor === 'variable'
                  ? <SelectorColor valor={estado.color_id} heredadoId={colorGrupo ?? heredadoColor}
                      biblioteca={biblioteca} onCambio={(id) => handleEstadoMiembro(lum.id, 'color_id', id)}
                      onAgregarBiblioteca={onAgregarColor} />
                  : <span className="text-gray-800 text-xs">—</span>}
              </td>
            )}
            {hayRobotica && (
              <td className="py-1">
                {lum.esRobotica
                  ? <SelectorPosicion valor={estado.posicion_id} heredadoId={posGrupo ?? heredadoPos}
                      biblioteca={biblioteca} onCambio={(id) => handleEstadoMiembro(lum.id, 'posicion_id', id)}
                      onAgregarBiblioteca={onAgregarPosicion} />
                  : <span className="text-gray-800 text-xs">—</span>}
              </td>
            )}
          </tr>
        )
      })}
    </>
  )
}

// ---------------------------------------------------------------------------
// FormularioEscena
// ---------------------------------------------------------------------------
function FormularioEscena({
  escenaActiva, setEscenaActiva, luminarias, biblioteca,
  escenas, etiquetaCue, modoEdicion, numeroCueInvalido,
  onGuardar, onGuardarNueva, onCancelarEdicion, onBlackoutRapido,
  onAgregarColor, onAgregarPosicion,
}) {
  const lumsOrdenadas = [...luminarias].sort((a, b) => Number(a.numero) - Number(b.numero))
  const hayVariable = luminarias.some((l) => l.tipoColor === 'variable')
  const hayRobotica = luminarias.some((l) => l.esRobotica)

  const indiceAnterior = modoEdicion
    ? escenas.findIndex((e) => e.id === escenaActiva.id) - 1
    : escenas.length - 1

  const getEstado = (lumId) =>
    escenaActiva.estados.find((e) => e.luminaria_id === lumId) ??
    { luminaria_id: lumId, intensidad: null, color_id: null, posicion_id: null }

  const handleEstado = (lumId, campo, valor) => {
    setEscenaActiva((prev) => {
      const existe = prev.estados.find((e) => e.luminaria_id === lumId)
      const nuevos = existe
        ? prev.estados.map((e) => e.luminaria_id === lumId ? { ...e, [campo]: valor } : e)
        : [...prev.estados, { luminaria_id: lumId, intensidad: null, color_id: null, posicion_id: null, [campo]: valor }]
      return { ...prev, estados: nuevos }
    })
  }

  const getHeredado = (lumId, campo) => {
    if (indiceAnterior < 0) return campo === 'intensidad' ? 0 : null
    if (campo === 'intensidad') return resolverIntensidad(escenas, indiceAnterior, lumId)
    if (campo === 'color') return resolverColor(escenas, indiceAnterior, lumId)
    if (campo === 'posicion') return resolverPosicion(escenas, indiceAnterior, lumId)
    return null
  }

  // Todo a 0 solo afecta intensidades. Color y posición se mantienen.
  const handleTodoACero = () => {
    setEscenaActiva((prev) => ({
      ...prev,
      estados: lumsOrdenadas.map((lum) => {
        const existente = prev.estados.find((e) => e.luminaria_id === lum.id) ?? {}
        return { luminaria_id: lum.id, color_id: null, posicion_id: null, ...existente, intensidad: 0 }
      }),
    }))
  }

  // Construye items de tabla agrupando
  const itemsTabla = []
  const gruposVistos = new Set()
  for (const lum of lumsOrdenadas) {
    if (!lum.grupoId) {
      itemsTabla.push({ tipo: 'luminaria', lum })
    } else if (!gruposVistos.has(lum.grupoId)) {
      gruposVistos.add(lum.grupoId)
      const miembros = lumsOrdenadas.filter((l) => l.grupoId === lum.grupoId)
      itemsTabla.push({ tipo: 'grupo', grupoId: lum.grupoId, nombreGrupo: lum.nombreGrupo, miembros })
    }
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Campos en grid 4 columnas */}
      <div className="grid grid-cols-4 gap-2">

        {/* Cue # */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">{etiquetaCue} #</label>
          <input type="number" step="any" value={escenaActiva.numero}
            onChange={(e) => setEscenaActiva((p) => ({ ...p, numero: e.target.value }))}
            className={`bg-gray-700 text-white rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 ${
              numeroCueInvalido ? 'ring-1 ring-red-500' : 'focus:ring-amber-500'}`} />
          {numeroCueInvalido && <span className="text-xs text-red-400">Número ya existe</span>}
        </div>

        {/* Pie */}
        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-xs text-gray-400">Pie (disparador)</label>
          <input type="text" value={escenaActiva.pie}
            onChange={(e) => setEscenaActiva((p) => ({ ...p, pie: e.target.value }))}
            placeholder="Texto o acción disparadora"
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
        </div>

        {/* Tiempos */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Entrada / Salida (s)</label>
          <div className="flex gap-1">
            <input type="number" min={0} step={0.5} value={escenaActiva.tiempoEntrada}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0
                setEscenaActiva((p) => ({
                  ...p, tiempoEntrada: val,
                  tiempoSalida: p.tiempoSalida === p.tiempoEntrada ? val : p.tiempoSalida,
                }))
              }}
              className="w-full bg-gray-700 text-white rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
            <input type="number" min={0} step={0.5} value={escenaActiva.tiempoSalida}
              onChange={(e) => setEscenaActiva((p) => ({ ...p, tiempoSalida: parseFloat(e.target.value) || 0 }))}
              className="w-full bg-gray-700 text-white rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
          </div>
        </div>

        {/* Nombre */}
        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-xs text-gray-400">Nombre / descripción</label>
          <textarea rows={2} value={escenaActiva.nombre}
            onChange={(e) => setEscenaActiva((p) => ({ ...p, nombre: e.target.value }))}
            placeholder="Descripción del estado de luz"
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none" />
        </div>

        {/* Tramoya */}
        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-xs text-gray-400">Tramoya y Escenografía</label>
          <textarea rows={2} value={escenaActiva.tramoya}
            onChange={(e) => setEscenaActiva((p) => ({ ...p, tramoya: e.target.value }))}
            placeholder="Cambios de tramoya"
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none" />
        </div>

        {/* Audio */}
        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-xs text-gray-400">Audio</label>
          <textarea rows={2} value={escenaActiva.audio}
            onChange={(e) => setEscenaActiva((p) => ({ ...p, audio: e.target.value }))}
            placeholder="Cambios de audio"
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none" />
        </div>

        {/* Video */}
        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-xs text-gray-400">Video y Efectos</label>
          <textarea rows={2} value={escenaActiva.videoEfectos}
            onChange={(e) => setEscenaActiva((p) => ({ ...p, videoEfectos: e.target.value }))}
            placeholder="Video, proyecciones, efectos"
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none" />
        </div>

        {/* Anotaciones — ocupa toda la fila */}
        <div className="flex flex-col gap-1 col-span-4">
          <label className="text-xs text-gray-400">Anotaciones</label>
          <textarea rows={2} value={escenaActiva.anotaciones}
            onChange={(e) => setEscenaActiva((p) => ({ ...p, anotaciones: e.target.value }))}
            placeholder="Notas libres"
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none" />
        </div>
      </div>

      {/* Tabla de luminarias */}
      {luminarias.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No hay luminarias registradas.</p>
      ) : (
        <div className="overflow-y-auto border border-gray-700 rounded" style={{ maxHeight: '50vh' }}>
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-gray-900 z-10">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
                <th className="py-2 px-2 w-6"></th>
                <th className="py-2 pr-4">Luminaria</th>
                <th className="py-2 pr-3 w-20">Intensidad</th>
                {hayVariable && <th className="py-2 pr-3 w-36">Color</th>}
                {hayRobotica && <th className="py-2 w-36">Posición</th>}
              </tr>
            </thead>
            <tbody>
              {itemsTabla.map((item) => {
                if (item.tipo === 'grupo') {
                  return (
                    <FilaGrupoGuion key={item.grupoId}
                      grupoId={item.grupoId} nombreGrupo={item.nombreGrupo} miembros={item.miembros}
                      escenaActiva={escenaActiva} setEscenaActiva={setEscenaActiva}
                      escenas={escenas} indiceAnterior={indiceAnterior}
                      biblioteca={biblioteca} hayVariable={hayVariable} hayRobotica={hayRobotica}
                      onAgregarColor={onAgregarColor} onAgregarPosicion={onAgregarPosicion} />
                  )
                }

                const lum = item.lum
                const estado = getEstado(lum.id)
                const heredadoInt = getHeredado(lum.id, 'intensidad')
                const heredadoColor = getHeredado(lum.id, 'color')
                const heredadoPos = getHeredado(lum.id, 'posicion')

                return (
                  <tr key={lum.id} className="border-b border-gray-700/60 hover:bg-gray-800/30">
                    <td className="py-1.5 px-2">
                      <span className="text-gray-600 font-mono text-xs">{lum.numero}</span>
                    </td>
                    <td className="py-1.5 pr-4">
                      <span className="text-white text-xs">{lum.nombre}</span>
                    </td>
                    <td className="py-1.5 pr-3">
                      <input type="number" min={0} max={100}
                        value={estado.intensidad ?? ''} placeholder={String(heredadoInt)}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Math.min(100, Math.max(0, parseInt(e.target.value)))
                          handleEstado(lum.id, 'intensidad', val)
                        }}
                        className="w-14 bg-gray-700 text-white rounded px-1.5 py-0.5 text-xs text-right placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
                    </td>
                    {hayVariable && (
                      <td className="py-1.5 pr-3">
                        {lum.tipoColor === 'variable'
                          ? <SelectorColor valor={estado.color_id} heredadoId={heredadoColor}
                              biblioteca={biblioteca} onCambio={(id) => handleEstado(lum.id, 'color_id', id)}
                              onAgregarBiblioteca={onAgregarColor} />
                          : <span className="text-gray-700 text-xs">—</span>}
                      </td>
                    )}
                    {hayRobotica && (
                      <td className="py-1.5">
                        {lum.esRobotica
                          ? <SelectorPosicion valor={estado.posicion_id} heredadoId={heredadoPos}
                              biblioteca={biblioteca} onCambio={(id) => handleEstado(lum.id, 'posicion_id', id)}
                              onAgregarBiblioteca={onAgregarPosicion} />
                          : <span className="text-gray-700 text-xs">—</span>}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Acciones — Todo a 0, Blackout rápido y guardar en la misma barra */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-700">
        <div className="flex gap-2">
          <button onClick={handleTodoACero}
            className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 hover:text-white transition-colors border border-gray-600">
            Todo a 0
          </button>
          <button onClick={onBlackoutRapido}
            className="px-3 py-1.5 text-xs bg-gray-800 text-gray-400 rounded hover:bg-gray-700 hover:text-white transition-colors border border-gray-700">
            ⬛ Blackout rápido
          </button>
        </div>
        <div className="flex gap-2 items-center">
          {modoEdicion && (
            <>
              <button onClick={onCancelarEdicion}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={onGuardarNueva}
                className="px-3 py-1.5 text-sm bg-gray-700 text-gray-200 font-medium rounded hover:bg-gray-600 transition-colors border border-gray-600">
                Guardar nueva
              </button>
              <button onClick={onGuardar} disabled={numeroCueInvalido}
                className="px-4 py-1.5 text-sm bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Actualizar escena
              </button>
            </>
          )}
          {!modoEdicion && (
            <button onClick={onGuardar}
              className="px-4 py-1.5 text-sm bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 transition-colors">
              Guardar escena
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FilaEscena — tarjeta en panel derecho
// ---------------------------------------------------------------------------
function FilaEscena({ escena, etiqueta, luminarias, biblioteca, escenas, indice, onEditar, onEliminar, onCopiar }) {
  const deltas = calcularDeltas(escenas, indice)
  const lumsMap = Object.fromEntries(luminarias.map((l) => [l.id, l]))

  // Agrupa deltas por lumId
  const deltasPorLum = {}
  deltas.forEach((d) => {
    if (!deltasPorLum[d.lumId]) deltasPorLum[d.lumId] = {}
    deltasPorLum[d.lumId][d.campo] = d
  })

  // Luminarias con cambio, ordenadas por número
  const lumsConCambio = Object.keys(deltasPorLum)
    .map((lumId) => lumsMap[lumId])
    .filter(Boolean)
    .sort((a, b) => Number(a.numero) - Number(b.numero))

  // Lógica de agrupación en tarjeta:
  // Si todas las luminarias de un grupo cambiaron igual en intensidad (y no hay individuales distintas),
  // mostrar el nombre del grupo. Si hay excepciones o más de 2 distintas, mostrar individual.
  const gruposMap = {}
  luminarias.forEach((lum) => {
    if (lum.grupoId) {
      if (!gruposMap[lum.grupoId]) gruposMap[lum.grupoId] = { nombre: lum.nombreGrupo, miembros: [] }
      gruposMap[lum.grupoId].miembros.push(lum.id)
    }
  })

  // Construye líneas de cambio: intenta colapsar grupos
  const lineas = []
  const lumsYaMostradas = new Set()

  // Para cada grupo, verificar si todos sus miembros con cambios tienen el mismo delta de intensidad
  // y no hay cambios individuales que difieran
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

    // Solo colapsar si hay más de 1 miembro con cambio y todos iguales
    if (todosIgual && miembrosConCambio.length > 1) {
      const cambios = deltasPorLum[miembrosConCambio[0]]
      const partes = []
      if (cambios.intensidad) partes.push(`${cambios.intensidad.nuevo}%`)
      if (cambios.color) {
        const nombre = cambios.color.nuevo
          ? biblioteca.colores.find((c) => c.id === cambios.color.nuevo)?.nombre ?? '?'
          : '—'
        partes.push(`🎨 ${nombre}`)
      }
      if (cambios.posicion) {
        const nombre = cambios.posicion.nuevo
          ? biblioteca.posiciones.find((p) => p.id === cambios.posicion.nuevo)?.nombre ?? '?'
          : '—'
        partes.push(`⤢ ${nombre}`)
      }
      lineas.push({ key: grupoId, etiqueta: grupo.nombre, partes, esGrupo: true })
      miembrosConCambio.forEach((id) => lumsYaMostradas.add(id))
    }
  }

  // Resto de luminarias con cambios no colapsadas
  lumsConCambio.forEach((lum) => {
    if (lumsYaMostradas.has(lum.id)) return
    const cambios = deltasPorLum[lum.id]
    const partes = []
    if (cambios.intensidad) partes.push(`${cambios.intensidad.nuevo}%`)
    if (cambios.color) {
      const nombre = cambios.color.nuevo
        ? biblioteca.colores.find((c) => c.id === cambios.color.nuevo)?.nombre ?? '?'
        : '—'
      partes.push(`🎨 ${nombre}`)
    }
    if (cambios.posicion) {
      const nombre = cambios.posicion.nuevo
        ? biblioteca.posiciones.find((p) => p.id === cambios.posicion.nuevo)?.nombre ?? '?'
        : '—'
      partes.push(`⤢ ${nombre}`)
    }
    lineas.push({ key: lum.id, etiqueta: lum.numero, partes, esGrupo: false })
  })

  return (
    <div className="border-b border-gray-800 py-2 px-2.5 hover:bg-gray-800/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Encabezado */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-amber-400 text-xs font-mono font-semibold shrink-0">
              {etiqueta} {escena.numero}
            </span>
            <span className="text-gray-600 text-xs">{escena.tiempoEntrada}s/{escena.tiempoSalida}s</span>
            {escena.pie && <span className="text-gray-400 text-xs italic truncate">{escena.pie}</span>}
          </div>
          {escena.nombre && <p className="text-gray-200 text-xs truncate">{escena.nombre}</p>}

          {/* Campos de producción en línea si existen */}
          {(escena.tramoya || escena.audio || escena.videoEfectos) && (
            <p className="text-gray-600 text-xs truncate mt-0.5">
              {[escena.tramoya && `🎭 ${escena.tramoya}`, escena.audio && `🔊 ${escena.audio}`, escena.videoEfectos && `📽 ${escena.videoEfectos}`].filter(Boolean).join('  ')}
            </p>
          )}

          {/* Bandera todo a cero */}
          {escena.todoACero && (
            <p className="text-gray-600 text-xs mt-0.5">⬛ Todo a 0</p>
          )}

          {/* Cambios en formato corrido: "1.- 50% · 🎨 Azul  3.- 75%  Vara 1.- 100%" */}
          {!escena.todoACero && lineas.length > 0 && (
            <p className="text-xs font-mono mt-0.5 leading-snug text-gray-500">
              {lineas.map((linea, i) => (
                <span key={linea.key}>
                  {i > 0 && '  '}
                  <span className="font-bold text-gray-300">{linea.etiqueta}</span>
                  <span>.- {linea.partes.join(' · ')}</span>
                </span>
              ))}
            </p>
          )}
        </div>

        {/* Acciones en columna */}
        <div className="flex flex-col gap-0.5 shrink-0 items-end">
          <button onClick={onEditar} className="text-xs text-gray-400 hover:text-white transition-colors">Editar</button>
          <button onClick={onCopiar} className="text-xs text-blue-500 hover:text-blue-300 transition-colors">Copiar</button>
          <button onClick={onEliminar} className="text-xs text-red-600 hover:text-red-400 transition-colors">Eliminar</button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PanelFiltros — búsqueda y filtros.
// IMPORTANTE: no llama callbacks durante el render. Expone estado al padre via useMemo.
// ---------------------------------------------------------------------------
function PanelFiltros({ escenas, luminarias, biblioteca, etiqueta, onFiltradas }) {
  const [texto, setTexto] = useState('')
  const [panelLumAbierto, setPanelLumAbierto] = useState(false)
  const [lumsSeleccionadas, setLumsSeleccionadas] = useState([])
  const [filtroColorId, setFiltroColorId] = useState('')
  const [filtroPosicionId, setFiltroPosicionId] = useState('')

  const lumsOrdenadas = useMemo(
    () => [...luminarias].sort((a, b) => Number(a.numero) - Number(b.numero)),
    [luminarias]
  )

  const hayFiltroActivo = Boolean(texto.trim() || lumsSeleccionadas.length > 0 || filtroColorId || filtroPosicionId)

  const toggleLum = (id) =>
    setLumsSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  // Calcula deltas una sola vez por escena cuando hay filtros activos que lo requieren
  const filtradas = useMemo(() => {
    if (!hayFiltroActivo) return null

    return escenas.filter((escena, indice) => {
      if (texto.trim()) {
        const q = texto.toLowerCase()
        const match =
          String(escena.numero).includes(q) ||
          escena.pie?.toLowerCase().includes(q) ||
          escena.nombre?.toLowerCase().includes(q) ||
          escena.anotaciones?.toLowerCase().includes(q) ||
          escena.tramoya?.toLowerCase().includes(q) ||
          escena.audio?.toLowerCase().includes(q) ||
          escena.videoEfectos?.toLowerCase().includes(q)
        if (!match) return false
      }

      // Filtros que requieren calcular deltas — solo cuando aplica
      const necesitaDeltas = lumsSeleccionadas.length > 0 || filtroColorId || filtroPosicionId
      if (necesitaDeltas) {
        const deltas = calcularDeltas(escenas, indice)

        if (lumsSeleccionadas.length > 0) {
          const cumple = lumsSeleccionadas.every((lumId) => deltas.some((d) => d.lumId === lumId))
          if (!cumple) return false
        }

        if (filtroColorId) {
          if (!deltas.some((d) => d.campo === 'color' && d.nuevo === filtroColorId)) return false
        }

        if (filtroPosicionId) {
          if (!deltas.some((d) => d.campo === 'posicion' && d.nuevo === filtroPosicionId)) return false
        }
      }

      return true
    })
  }, [escenas, texto, lumsSeleccionadas, filtroColorId, filtroPosicionId, hayFiltroActivo])

  // Notificar al padre solo cuando cambia el resultado (via useEffect en padre, aquí usamos ref pattern)
  // Solución: pasar el resultado directamente como retorno de render via prop-callback en useEffect
  // Para evitar llamar onFiltradas durante render (causa loop), usamos useRef para comparar
  const prevFiltradas = useRef(undefined)
  if (prevFiltradas.current !== filtradas) {
    prevFiltradas.current = filtradas
    // Diferir la notificación fuera del render actual
    Promise.resolve().then(() => onFiltradas(filtradas))
  }

  const limpiar = () => {
    setTexto(''); setLumsSeleccionadas([]); setFiltroColorId(''); setFiltroPosicionId('')
  }

  return (
    <div className="flex flex-col gap-1.5 px-2 py-2 border-b border-gray-700">
      <input type="text" value={texto} onChange={(e) => setTexto(e.target.value)}
        placeholder={`Buscar ${etiqueta}, pie, nombre...`}
        className="w-full bg-gray-700 text-white rounded px-2.5 py-1 text-xs placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />

      <div className="flex gap-1.5 flex-wrap items-center">
        {/* Multi-selección de luminarias */}
        <div className="relative">
          <button onClick={() => setPanelLumAbierto((v) => !v)}
            className={`px-2 py-1 text-xs rounded transition-colors border ${
              lumsSeleccionadas.length > 0
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-gray-700 text-gray-400 border-gray-600 hover:text-white'}`}>
            Luminarias {lumsSeleccionadas.length > 0 ? `(${lumsSeleccionadas.length})` : '▾'}
          </button>
          {panelLumAbierto && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-gray-800 border border-gray-600 rounded shadow-xl w-48 max-h-48 overflow-y-auto">
              {lumsOrdenadas.map((lum) => (
                <label key={lum.id}
                  className="flex items-center gap-2 px-2 py-1 hover:bg-gray-700 cursor-pointer">
                  <input type="checkbox" checked={lumsSeleccionadas.includes(lum.id)}
                    onChange={() => toggleLum(lum.id)}
                    className="accent-amber-500 w-3 h-3 shrink-0" />
                  <span className="text-gray-400 font-mono text-xs shrink-0">{lum.numero}</span>
                  <span className="text-gray-300 text-xs truncate">{lum.nombre}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {biblioteca.colores.length > 0 && (
          <select value={filtroColorId} onChange={(e) => setFiltroColorId(e.target.value)}
            className={`px-2 py-1 text-xs rounded border focus:outline-none transition-colors ${
              filtroColorId ? 'bg-blue-700 text-white border-blue-500' : 'bg-gray-700 text-gray-400 border-gray-600'}`}>
            <option value="">🎨 Color</option>
            {biblioteca.colores.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        )}

        {biblioteca.posiciones.length > 0 && (
          <select value={filtroPosicionId} onChange={(e) => setFiltroPosicionId(e.target.value)}
            className={`px-2 py-1 text-xs rounded border focus:outline-none transition-colors ${
              filtroPosicionId ? 'bg-purple-700 text-white border-purple-500' : 'bg-gray-700 text-gray-400 border-gray-600'}`}>
            <option value="">⤢ Posición</option>
            {biblioteca.posiciones.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        )}

        {hayFiltroActivo && (
          <button onClick={limpiar}
            className="px-2 py-1 text-xs text-gray-500 hover:text-white transition-colors">
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ListaEscenas — paginación + tarjetas
// ---------------------------------------------------------------------------
const ESCENAS_POR_PAGINA = 10

function ListaEscenas({ escenas, luminarias, biblioteca, etiqueta, paginaObjetivo, onEditar, onEliminar, onCopiar }) {
  const [escenasFiltradas, setEscenasFiltradas] = useState(null)
  const [pagina, setPagina] = useState(1)

  // Cuando el padre indica una página objetivo (tras guardar), navegar ahí
  const prevPaginaObjetivo = useRef(null)
  if (paginaObjetivo !== null && paginaObjetivo !== prevPaginaObjetivo.current) {
    prevPaginaObjetivo.current = paginaObjetivo
    Promise.resolve().then(() => setPagina(paginaObjetivo))
  }

  const handleFiltradas = (resultado) => {
    setEscenasFiltradas(resultado)
    setPagina(1)
  }

  const fuente = escenasFiltradas ?? escenas
  const totalPaginas = Math.max(1, Math.ceil(fuente.length / ESCENAS_POR_PAGINA))
  // Nunca dejar pagina fuera de rango
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = fuente.slice((paginaActual - 1) * ESCENAS_POR_PAGINA, paginaActual * ESCENAS_POR_PAGINA)

  const irPagina = (n) => setPagina(Math.min(totalPaginas, Math.max(1, n)))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Encabezado */}
      <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between shrink-0">
        <EtiquetaCue valor={etiqueta} onGuardar={() => {}} />
        <span className="text-xs text-gray-600">{escenas.length}</span>
      </div>

      <PanelFiltros
        escenas={escenas} luminarias={luminarias} biblioteca={biblioteca}
        etiqueta={etiqueta} onFiltradas={handleFiltradas} />

      <div className="overflow-y-auto flex-1">
        {fuente.length === 0 ? (
          <p className="text-center text-gray-600 text-xs py-8">Sin resultados</p>
        ) : (
          visibles.map((escena) => {
            const indiceReal = escenas.findIndex((e) => e.id === escena.id)
            return (
              <FilaEscena key={escena.id} escena={escena} etiqueta={etiqueta}
                luminarias={luminarias} biblioteca={biblioteca}
                escenas={escenas} indice={indiceReal}
                onEditar={() => onEditar(escena)}
                onEliminar={() => onEliminar(escena.id)}
                onCopiar={() => onCopiar(escena)} />
            )
          })
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-700 shrink-0">
          <button onClick={() => irPagina(paginaActual - 1)} disabled={paginaActual === 1}
            className="text-xs text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
            ← Ant
          </button>
          <span className="text-xs text-gray-500">{paginaActual} / {totalPaginas}</span>
          <button onClick={() => irPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas}
            className="text-xs text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
            Sig →
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SceneManager — componente principal
// ---------------------------------------------------------------------------
export default function SceneManager({ project, onUpdate }) {
  const escenas = project.escenas ?? []
  const luminarias = project.luminarias ?? []
  const biblioteca = project.biblioteca ?? { colores: [], posiciones: [] }
  const etiquetaCue = project.configuracion?.etiquetaCue ?? 'Cue'

  const [escenaActiva, setEscenaActiva] = useState(() =>
    crearEscenaVacia(siguienteNumeroCue(escenas), escenas[escenas.length - 1])
  )
  const [modoEdicion, setModoEdicion] = useState(false)
  const [anchoPanelIzq, setAnchoPanelIzq] = useState(62)
  // Página a la que debe navegar ListaEscenas tras guardar (null = no forzar)
  const [paginaObjetivo, setPaginaObjetivo] = useState(null)
  const arrastrando = useRef(false)
  const contenedorRef = useRef(null)

  const numeroCueInvalido =
    modoEdicion && numeroDuplicado(escenas, escenaActiva.numero, escenaActiva.id)

  const persistir = async (proyectoActualizado) => {
    onUpdate(proyectoActualizado)
    await saveProject(proyectoActualizado)
  }

  const handleAgregarColor = (nuevoColor) => {
    persistir({ ...project, biblioteca: { ...biblioteca, colores: [...biblioteca.colores, nuevoColor] } })
  }

  const handleAgregarPosicion = (nuevaPos) => {
    persistir({ ...project, biblioteca: { ...biblioteca, posiciones: [...biblioteca.posiciones, nuevaPos] } })
  }

  // Guardar / actualizar escena.
  // El flag todoACero se calcula automáticamente: true si todas las intensidades resueltas son 0.
  const handleGuardarEscena = () => {
    let nuevasEscenas
    if (modoEdicion) {
      const sinFlag = escenas.map((e) => e.id === escenaActiva.id ? escenaActiva : e)
      nuevasEscenas = aplicarFlagTodoACero(sinFlag, escenaActiva.id, luminarias)
    } else {
      const estadosCompletos = luminarias.map((lum) =>
        escenaActiva.estados.find((e) => e.luminaria_id === lum.id) ??
        { luminaria_id: lum.id, intensidad: null, color_id: null, posicion_id: null }
      )
      const sinFlag = insertarEnOrden(escenas, { ...escenaActiva, estados: estadosCompletos })
      nuevasEscenas = aplicarFlagTodoACero(sinFlag, escenaActiva.id, luminarias)
    }
    // Calcular en qué página queda la escena guardada y navegar ahí
    const idxGuardada = nuevasEscenas.findIndex((e) => e.id === escenaActiva.id)
    setPaginaObjetivo(Math.ceil((idxGuardada + 1) / ESCENAS_POR_PAGINA))
    persistir({ ...project, escenas: nuevasEscenas })
    setEscenaActiva(crearEscenaVacia(siguienteNumeroCue(nuevasEscenas), escenaActiva))
    setModoEdicion(false)
  }

  // Guardar como nueva escena (desde modo edición)
  const handleGuardarNueva = () => {
    const siguiente = siguienteNumeroCue(escenas)
    const estadosCompletos = luminarias.map((lum) =>
      escenaActiva.estados.find((e) => e.luminaria_id === lum.id) ??
      { luminaria_id: lum.id, intensidad: null, color_id: null, posicion_id: null }
    )
    const nueva = { ...escenaActiva, id: generateId(), numero: String(siguiente), estados: estadosCompletos }
    const sinFlag = insertarEnOrden(escenas, nueva)
    const nuevasEscenas = aplicarFlagTodoACero(sinFlag, nueva.id, luminarias)
    const idxGuardada = nuevasEscenas.findIndex((e) => e.id === nueva.id)
    setPaginaObjetivo(Math.ceil((idxGuardada + 1) / ESCENAS_POR_PAGINA))
    persistir({ ...project, escenas: nuevasEscenas })
    setEscenaActiva(crearEscenaVacia(siguienteNumeroCue(nuevasEscenas), nueva))
    setModoEdicion(false)
  }

  // Copiar escena — mantiene estados y campos de producción, asigna número siguiente
  const handleCopiarEscena = (escena) => {
    const siguiente = siguienteNumeroCue(escenas)
    setEscenaActiva({
      ...escena,
      id: generateId(),
      numero: String(siguiente),
      // todoACero NO se copia: se recalculará al guardar
      todoACero: false,
    })
    setModoEdicion(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEditar = (escena) => {
    setEscenaActiva({ ...escena })
    setModoEdicion(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelarEdicion = () => {
    setEscenaActiva(crearEscenaVacia(siguienteNumeroCue(escenas), escenas[escenas.length - 1]))
    setModoEdicion(false)
  }

  const handleEliminar = (id) => {
    if (!confirm('¿Eliminar esta escena? Esta acción no se puede deshacer.')) return
    persistir({ ...project, escenas: escenas.filter((e) => e.id !== id) })
  }

  // Blackout rápido — crea escena con todas las intensidades en 0 directamente
  const handleBlackoutRapido = () => {
    const siguiente = siguienteNumeroCue(escenas)
    const estados = luminarias.map((lum) => ({
      luminaria_id: lum.id, intensidad: 0, color_id: null, posicion_id: null,
    }))
    const nueva = { ...crearEscenaVacia(siguiente, escenas[escenas.length - 1]), estados }
    const sinFlag = insertarEnOrden(escenas, nueva)
    const nuevasEscenas = aplicarFlagTodoACero(sinFlag, nueva.id, luminarias)
    const idxGuardada = nuevasEscenas.findIndex((e) => e.id === nueva.id)
    setPaginaObjetivo(Math.ceil((idxGuardada + 1) / ESCENAS_POR_PAGINA))
    persistir({ ...project, escenas: nuevasEscenas })
  }

  // Divisor arrastrable
  const handleMouseDownDivisor = (e) => {
    e.preventDefault()
    arrastrando.current = true
    const mover = (ev) => {
      if (!arrastrando.current || !contenedorRef.current) return
      const rect = contenedorRef.current.getBoundingClientRect()
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      setAnchoPanelIzq(Math.min(80, Math.max(50, pct)))
    }
    const soltar = () => {
      arrastrando.current = false
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Guion de iluminación</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {escenas.length} escena{escenas.length !== 1 ? 's' : ''} guardada{escenas.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div ref={contenedorRef} className="flex relative" style={{ height: '85vh' }}>

        {/* Panel izquierdo */}
        <div className="flex flex-col overflow-hidden" style={{ width: `${anchoPanelIzq}%` }}>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 h-full overflow-y-auto">
            <h2 className="text-sm font-semibold text-white mb-3">
              {modoEdicion ? `Editando ${etiquetaCue} ${escenaActiva.numero}` : 'Nueva escena'}
            </h2>
            <FormularioEscena
              escenaActiva={escenaActiva} setEscenaActiva={setEscenaActiva}
              luminarias={luminarias} biblioteca={biblioteca} escenas={escenas}
              etiquetaCue={etiquetaCue} modoEdicion={modoEdicion} numeroCueInvalido={numeroCueInvalido}
              onGuardar={handleGuardarEscena} onGuardarNueva={handleGuardarNueva}
              onCancelarEdicion={handleCancelarEdicion} onBlackoutRapido={handleBlackoutRapido}
              onAgregarColor={handleAgregarColor} onAgregarPosicion={handleAgregarPosicion} />
          </div>
        </div>

        {/* Divisor */}
        <div onMouseDown={handleMouseDownDivisor}
          className="w-2 cursor-col-resize flex items-center justify-center shrink-0 group">
          <div className="w-0.5 h-full bg-gray-700 group-hover:bg-amber-500 transition-colors" />
        </div>

        {/* Panel derecho */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 flex flex-col h-full overflow-hidden">
            <ListaEscenas
              escenas={escenas} luminarias={luminarias} biblioteca={biblioteca}
              etiqueta={etiquetaCue} paginaObjetivo={paginaObjetivo}
              onEditar={handleEditar} onEliminar={handleEliminar} onCopiar={handleCopiarEscena} />
          </div>
        </div>
      </div>
    </div>
  )
}