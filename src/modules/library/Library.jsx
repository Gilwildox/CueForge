// Módulo 6 — Biblioteca
// Administración directa de colores y posiciones del proyecto (independiente del guion)
import { useState } from 'react'
import { saveProject } from '../../db/database'
import { generateId, FABRICANTES_GOBO_BASE, getFabricantesGoboExtra } from '../../utils/helpers'

// ---------------------------------------------------------------------------
// FormularioColor — alta/edición inline
// ---------------------------------------------------------------------------
function FormularioColor({ colorInicial, onGuardar, onCancelar }) {
  const [nombre, setNombre] = useState(colorInicial?.nombre ?? '')
  const [hex, setHex] = useState(colorInicial?.hex ?? '#ffffff')
  const [descripcion, setDescripcion] = useState(colorInicial?.descripcion ?? '')

  const confirmar = () => {
    if (!nombre.trim()) return
    onGuardar({
      id: colorInicial?.id ?? generateId(),
      nombre: nombre.trim(),
      hex,
      descripcion: descripcion.trim(),
    })
  }

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Color</label>
          <input type="color" value={hex} onChange={(e) => setHex(e.target.value)}
            className="w-full h-9 rounded cursor-pointer bg-gray-700 border-0" />
        </div>
        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-xs text-gray-400">Nombre *</label>
          <input autoFocus type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Azul profundo"
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">Descripción</label>
        <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Notas libres"
          className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancelar}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">
          Cancelar
        </button>
        <button onClick={confirmar} disabled={!nombre.trim()}
          className="px-4 py-1.5 text-sm bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {colorInicial ? 'Actualizar' : 'Agregar color'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FormularioPosicion — alta/edición inline
// ---------------------------------------------------------------------------
function FormularioPosicion({ posicionInicial, onGuardar, onCancelar }) {
  const [nombre, setNombre] = useState(posicionInicial?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(posicionInicial?.descripcion ?? '')

  const confirmar = () => {
    if (!nombre.trim()) return
    onGuardar({
      id: posicionInicial?.id ?? generateId(),
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
    })
  }

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Nombre *</label>
          <input autoFocus type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Centro, Diagonal izq..."
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Descripción</label>
          <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Notas libres"
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancelar}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">
          Cancelar
        </button>
        <button onClick={confirmar} disabled={!nombre.trim()}
          className="px-4 py-1.5 text-sm bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {posicionInicial ? 'Actualizar' : 'Agregar posición'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// IndicadorUso — muestra en qué escenas (cues) aparece un color/posición.
// Sin botones de acción: solo lista informativa. Se inhabilita si no hay uso.
// ---------------------------------------------------------------------------
function IndicadorUso({ id, campo, escenas, etiquetaCue }) {
  const [abierto, setAbierto] = useState(false)

  // Busca en qué escenas el campo (color_id o posicion_id) referencia este id
  const cuesConUso = escenas
    .filter((esc) => esc.estados?.some((est) => est[campo] === id))
    .map((esc) => esc.numero)

  if (cuesConUso.length === 0) {
    return <span className="text-xs text-gray-600 cursor-default">Sin uso</span>
  }

  return (
    <div className="relative inline-block">
      <button onClick={() => setAbierto((v) => !v)}
        className="text-xs text-gray-400 hover:text-white transition-colors">
        Usado en {cuesConUso.length} escena{cuesConUso.length !== 1 ? 's' : ''} {abierto ? '▾' : '▸'}
      </button>
      {abierto && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-gray-800 border border-gray-600 rounded shadow-xl px-3 py-2 whitespace-nowrap">
          <p className="text-xs text-gray-500 mb-1">{etiquetaCue}s donde aparece:</p>
          <p className="text-xs text-gray-300 font-mono">
            {cuesConUso.map((n) => `${etiquetaCue} ${n}`).join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FormularioGobo — alta/edición inline. Fabricante: catálogo + libre (mismo
// patrón que tipo de luminaria en LuminariaForm.jsx)
// ---------------------------------------------------------------------------
function FormularioGobo({ goboInicial, gobosExistentes, onGuardar, onCancelar }) {
  const [nombre, setNombre] = useState(goboInicial?.nombre ?? '')
  const [fabricante, setFabricante] = useState(goboInicial?.fabricante ?? '')
  const [fabricantePersonalizado, setFabricantePersonalizado] = useState(
    Boolean(goboInicial?.fabricante) &&
    !FABRICANTES_GOBO_BASE.includes(goboInicial.fabricante) &&
    !getFabricantesGoboExtra(gobosExistentes).includes(goboInicial.fabricante)
  )
  const [codigoFabricante, setCodigoFabricante] = useState(goboInicial?.codigoFabricante ?? '')
  const [descripcion, setDescripcion] = useState(goboInicial?.descripcion ?? '')

  const fabricantesExtra = getFabricantesGoboExtra(gobosExistentes)
  const todosLosFabricantes = [...FABRICANTES_GOBO_BASE, ...fabricantesExtra]

  const handleFabricante = (value) => {
    if (value === '__otro__') {
      setFabricantePersonalizado(true)
      setFabricante('')
    } else {
      setFabricantePersonalizado(false)
      setFabricante(value)
    }
  }

  const selectValue = fabricantePersonalizado
    ? '__otro__'
    : todosLosFabricantes.includes(fabricante)
    ? fabricante
    : ''

  const confirmar = () => {
    if (!nombre.trim()) return
    onGuardar({
      id: goboInicial?.id ?? generateId(),
      nombre: nombre.trim(),
      fabricante: fabricante.trim(),
      codigoFabricante: codigoFabricante.trim(),
      descripcion: descripcion.trim(),
    })
  }

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Nombre *</label>
          <input autoFocus type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Nubes, Ramas, Ventana..."
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Código fabricante</label>
          <input type="text" value={codigoFabricante} onChange={(e) => setCodigoFabricante(e.target.value)}
            placeholder="Ej: 77716"
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">Fabricante</label>
        <select value={selectValue} onChange={(e) => handleFabricante(e.target.value)}
          className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500">
          <option value="">— Selecciona —</option>
          {FABRICANTES_GOBO_BASE.map((f) => <option key={f} value={f}>{f}</option>)}
          {fabricantesExtra.length > 0 && (
            <>
              <option disabled>──────────</option>
              {fabricantesExtra.map((f) => <option key={f} value={f}>{f}</option>)}
            </>
          )}
          <option value="__otro__">Otro / personalizado...</option>
        </select>
        {fabricantePersonalizado && (
          <input type="text" value={fabricante} onChange={(e) => setFabricante(e.target.value)}
            placeholder="Escribe el fabricante..."
            className="mt-1 bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">Descripción</label>
        <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Notas libres"
          className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancelar}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">
          Cancelar
        </button>
        <button onClick={confirmar} disabled={!nombre.trim()}
          className="px-4 py-1.5 text-sm bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {goboInicial ? 'Actualizar' : 'Agregar gobo'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// IndicadorUsoGobo — muestra qué luminarias tienen asignado este gobo.
// A diferencia de IndicadorUso (colores/posiciones en escenas), busca en
// luminarias.gobo_id directamente, no en estados de escena.
// ---------------------------------------------------------------------------
function IndicadorUsoGobo({ id, luminarias }) {
  const [abierto, setAbierto] = useState(false)

  const lumsConUso = luminarias.filter((l) => l.gobo_id === id)

  if (lumsConUso.length === 0) {
    return <span className="text-xs text-gray-600 cursor-default">Sin uso</span>
  }

  return (
    <div className="relative inline-block">
      <button onClick={() => setAbierto((v) => !v)}
        className="text-xs text-gray-400 hover:text-white transition-colors">
        Usado en {lumsConUso.length} luminaria{lumsConUso.length !== 1 ? 's' : ''} {abierto ? '▾' : '▸'}
      </button>
      {abierto && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-gray-800 border border-gray-600 rounded shadow-xl px-3 py-2 whitespace-nowrap">
          <p className="text-xs text-gray-500 mb-1">Luminarias que lo portan:</p>
          <p className="text-xs text-gray-300 font-mono">
            {lumsConUso.map((l) => `${l.numero}. ${l.nombre}`).join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TablaColores
// ---------------------------------------------------------------------------
function TablaColores({ colores, escenas, etiquetaCue, onEditar, onEliminar }) {
  if (colores.length === 0)
    return <p className="text-sm text-gray-500 py-4">No hay colores registrados.</p>

  const ordenados = [...colores].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
          <th className="py-2 pr-3 w-10"></th>
          <th className="py-2 pr-4">Nombre</th>
          <th className="py-2 pr-4">Descripción</th>
          <th className="py-2 pr-4">Uso</th>
          <th className="py-2 w-24"></th>
        </tr>
      </thead>
      <tbody>
        {ordenados.map((c) => (
          <tr key={c.id} className="border-b border-gray-800 hover:bg-gray-800/30">
            <td className="py-2 pr-3">
              <span className="inline-block w-5 h-5 rounded-full border border-gray-600"
                style={{ backgroundColor: c.hex }} title={c.hex} />
            </td>
            <td className="py-2 pr-4 text-white">{c.nombre}</td>
            <td className="py-2 pr-4 text-gray-500 text-xs truncate max-w-xs">{c.descripcion || '—'}</td>
            <td className="py-2 pr-4">
              <IndicadorUso id={c.id} campo="color_id" escenas={escenas} etiquetaCue={etiquetaCue} />
            </td>
            <td className="py-2 text-right whitespace-nowrap">
              <button onClick={() => onEditar(c)}
                className="text-xs text-gray-400 hover:text-white transition-colors mr-3">Editar</button>
              <button onClick={() => onEliminar(c.id)}
                className="text-xs text-red-600 hover:text-red-400 transition-colors">Eliminar</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---------------------------------------------------------------------------
// TablaPosiciones
// ---------------------------------------------------------------------------
function TablaPosiciones({ posiciones, escenas, etiquetaCue, onEditar, onEliminar }) {
  if (posiciones.length === 0)
    return <p className="text-sm text-gray-500 py-4">No hay posiciones registradas.</p>

  const ordenadas = [...posiciones].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
          <th className="py-2 pr-4">Nombre</th>
          <th className="py-2 pr-4">Descripción</th>
          <th className="py-2 pr-4">Uso</th>
          <th className="py-2 w-24"></th>
        </tr>
      </thead>
      <tbody>
        {ordenadas.map((p) => (
          <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-800/30">
            <td className="py-2 pr-4 text-white">{p.nombre}</td>
            <td className="py-2 pr-4 text-gray-500 text-xs truncate max-w-md">{p.descripcion || '—'}</td>
            <td className="py-2 pr-4">
              <IndicadorUso id={p.id} campo="posicion_id" escenas={escenas} etiquetaCue={etiquetaCue} />
            </td>
            <td className="py-2 text-right whitespace-nowrap">
              <button onClick={() => onEditar(p)}
                className="text-xs text-gray-400 hover:text-white transition-colors mr-3">Editar</button>
              <button onClick={() => onEliminar(p.id)}
                className="text-xs text-red-600 hover:text-red-400 transition-colors">Eliminar</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---------------------------------------------------------------------------
// TablaGobos
// ---------------------------------------------------------------------------
function TablaGobos({ gobos, luminarias, onEditar, onEliminar }) {
  if (gobos.length === 0)
    return <p className="text-sm text-gray-500 py-4">No hay gobos registrados.</p>

  const ordenados = [...gobos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
          <th className="py-2 pr-4">Nombre</th>
          <th className="py-2 pr-4">Fabricante</th>
          <th className="py-2 pr-4">Código</th>
          <th className="py-2 pr-4">Descripción</th>
          <th className="py-2 pr-4">Uso</th>
          <th className="py-2 w-24"></th>
        </tr>
      </thead>
      <tbody>
        {ordenados.map((g) => (
          <tr key={g.id} className="border-b border-gray-800 hover:bg-gray-800/30">
            <td className="py-2 pr-4 text-white">{g.nombre}</td>
            <td className="py-2 pr-4 text-gray-400">{g.fabricante || '—'}</td>
            <td className="py-2 pr-4 text-gray-400 font-mono text-xs">{g.codigoFabricante || '—'}</td>
            <td className="py-2 pr-4 text-gray-500 text-xs truncate max-w-xs">{g.descripcion || '—'}</td>
            <td className="py-2 pr-4">
              <IndicadorUsoGobo id={g.id} luminarias={luminarias} />
            </td>
            <td className="py-2 text-right whitespace-nowrap">
              <button onClick={() => onEditar(g)}
                className="text-xs text-gray-400 hover:text-white transition-colors mr-3">Editar</button>
              <button onClick={() => onEliminar(g.id)}
                className="text-xs text-red-600 hover:text-red-400 transition-colors">Eliminar</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---------------------------------------------------------------------------
// Library — componente principal
// ---------------------------------------------------------------------------
export default function Library({ project, onUpdate }) {
  // Normaliza biblioteca para proyectos guardados antes de agregar 'gobos'
  // (o cualquier otra llave faltante), evitando errores de undefined.
  const biblioteca = {
    colores: project.biblioteca?.colores ?? [],
    posiciones: project.biblioteca?.posiciones ?? [],
    gobos: project.biblioteca?.gobos ?? [],
  }
  const escenas = project.escenas ?? []
  const luminarias = project.luminarias ?? []
  const etiquetaCue = project.configuracion?.etiquetaCue ?? 'Cue'

  const [tab, setTab] = useState('colores') // 'colores' | 'posiciones' | 'gobos'
  const [editandoColor, setEditandoColor] = useState(null) // null | {} (nuevo) | objeto existente
  const [editandoPosicion, setEditandoPosicion] = useState(null)
  const [editandoGobo, setEditandoGobo] = useState(null)

  const persistir = async (proyectoActualizado) => {
    onUpdate(proyectoActualizado)
    await saveProject(proyectoActualizado)
  }

  // --- Colores ---
  const guardarColor = (color) => {
    const existe = biblioteca.colores.some((c) => c.id === color.id)
    const nuevosColores = existe
      ? biblioteca.colores.map((c) => (c.id === color.id ? color : c))
      : [...biblioteca.colores, color]
    persistir({ ...project, biblioteca: { ...biblioteca, colores: nuevosColores } })
    setEditandoColor(null)
  }

  const eliminarColor = (id) => {
    if (!confirm('¿Eliminar este color? Las escenas que lo usan quedarán con la referencia rota. Esta acción no se puede deshacer.')) return
    persistir({ ...project, biblioteca: { ...biblioteca, colores: biblioteca.colores.filter((c) => c.id !== id) } })
  }

  // --- Posiciones ---
  const guardarPosicion = (posicion) => {
    const existe = biblioteca.posiciones.some((p) => p.id === posicion.id)
    const nuevasPosiciones = existe
      ? biblioteca.posiciones.map((p) => (p.id === posicion.id ? posicion : p))
      : [...biblioteca.posiciones, posicion]
    persistir({ ...project, biblioteca: { ...biblioteca, posiciones: nuevasPosiciones } })
    setEditandoPosicion(null)
  }

  const eliminarPosicion = (id) => {
    if (!confirm('¿Eliminar esta posición? Las escenas que la usan quedarán con la referencia rota. Esta acción no se puede deshacer.')) return
    persistir({ ...project, biblioteca: { ...biblioteca, posiciones: biblioteca.posiciones.filter((p) => p.id !== id) } })
  }

  // --- Gobos ---
  const guardarGobo = (gobo) => {
    const existe = biblioteca.gobos.some((g) => g.id === gobo.id)
    const nuevosGobos = existe
      ? biblioteca.gobos.map((g) => (g.id === gobo.id ? gobo : g))
      : [...biblioteca.gobos, gobo]
    persistir({ ...project, biblioteca: { ...biblioteca, gobos: nuevosGobos } })
    setEditandoGobo(null)
  }

  const eliminarGobo = (id) => {
    if (!confirm('¿Eliminar este gobo? Las luminarias que lo tienen asignado quedarán sin gobo. Esta acción no se puede deshacer.')) return
    // Limpia la referencia en las luminarias que lo usaban, para no dejar gobo_id huérfanos
    const nuevasLuminarias = luminarias.map((l) =>
      l.gobo_id === id ? { ...l, gobo_id: null } : l
    )
    persistir({
      ...project,
      luminarias: nuevasLuminarias,
      biblioteca: { ...biblioteca, gobos: biblioteca.gobos.filter((g) => g.id !== id) },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Biblioteca</h1>
        <p className="text-sm text-gray-400 mt-0.5">Colores y posiciones disponibles en el guion de este proyecto.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700">
        <button onClick={() => setTab('colores')}
          className={`px-4 py-2 text-sm transition-colors border-b-2 ${
            tab === 'colores' ? 'border-amber-500 text-white font-medium' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          Colores ({biblioteca.colores.length})
        </button>
        <button onClick={() => setTab('posiciones')}
          className={`px-4 py-2 text-sm transition-colors border-b-2 ${
            tab === 'posiciones' ? 'border-amber-500 text-white font-medium' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          Posiciones ({biblioteca.posiciones.length})
        </button>
        <button onClick={() => setTab('gobos')}
          className={`px-4 py-2 text-sm transition-colors border-b-2 ${
            tab === 'gobos' ? 'border-amber-500 text-white font-medium' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          Gobos ({biblioteca.gobos.length})
        </button>
      </div>

      {tab === 'colores' && (
        <div className="flex flex-col gap-3">
          {editandoColor !== null ? (
            <FormularioColor
              colorInicial={editandoColor.id ? editandoColor : null}
              onGuardar={guardarColor}
              onCancelar={() => setEditandoColor(null)}
            />
          ) : (
            <button onClick={() => setEditandoColor({})}
              className="self-start px-4 py-1.5 text-sm bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 transition-colors">
              + Agregar color
            </button>
          )}

          <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
            <TablaColores colores={biblioteca.colores} escenas={escenas} etiquetaCue={etiquetaCue}
              onEditar={setEditandoColor} onEliminar={eliminarColor} />
          </div>
        </div>
      )}

      {tab === 'posiciones' && (
        <div className="flex flex-col gap-3">
          {editandoPosicion !== null ? (
            <FormularioPosicion
              posicionInicial={editandoPosicion.id ? editandoPosicion : null}
              onGuardar={guardarPosicion}
              onCancelar={() => setEditandoPosicion(null)}
            />
          ) : (
            <button onClick={() => setEditandoPosicion({})}
              className="self-start px-4 py-1.5 text-sm bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 transition-colors">
              + Agregar posición
            </button>
          )}

          <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
            <TablaPosiciones posiciones={biblioteca.posiciones} escenas={escenas} etiquetaCue={etiquetaCue}
              onEditar={setEditandoPosicion} onEliminar={eliminarPosicion} />
          </div>
        </div>
      )}

      {tab === 'gobos' && (
        <div className="flex flex-col gap-3">
          {editandoGobo !== null ? (
            <FormularioGobo
              goboInicial={editandoGobo.id ? editandoGobo : null}
              gobosExistentes={biblioteca.gobos}
              onGuardar={guardarGobo}
              onCancelar={() => setEditandoGobo(null)}
            />
          ) : (
            <button onClick={() => setEditandoGobo({})}
              className="self-start px-4 py-1.5 text-sm bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 transition-colors">
              + Agregar gobo
            </button>
          )}

          <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
            <TablaGobos gobos={biblioteca.gobos} luminarias={luminarias}
              onEditar={setEditandoGobo} onEliminar={eliminarGobo} />
          </div>
        </div>
      )}
    </div>
  )
}
