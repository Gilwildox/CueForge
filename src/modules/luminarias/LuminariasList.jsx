// Módulo principal de luminarias — tabla con soporte de grupos (Fase B)
import { useState } from 'react'
import LuminariaForm from './LuminariaForm'
import { camposAdvertencia, generateId } from '../../utils/helpers'

// Ícono de advertencia con tooltip
function AdvertenciaIcon({ faltantes }) {
  const [hover, setHover] = useState(false)
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="text-amber-400 text-xs cursor-default select-none">⚠</span>
      {hover && (
        <span className="absolute left-5 top-0 z-10 bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1.5 whitespace-nowrap shadow-lg">
          Faltan: {faltantes.join(', ')}
        </span>
      )}
    </span>
  )
}

// Celda de color según tipoColor
function CeldaColor({ lum }) {
  if (lum.tipoColor === 'fijo') {
    return (
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block w-3 h-3 rounded-full border border-gray-600 shrink-0"
          style={{ backgroundColor: lum.colorFijo.hex }}
        />
        <span className="text-gray-300 text-xs">
          {lum.colorFijo.nombre || lum.colorFijo.hex}
        </span>
      </span>
    )
  }
  if (lum.tipoColor === 'variable') {
    return <span className="text-xs text-blue-400">Variable</span>
  }
  return <span className="text-xs text-gray-500">—</span>
}

// Modal para asignar nombre al grupo
function ModalNombreGrupo({ onConfirm, onCancel }) {
  const [nombre, setNombre] = useState('')
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-sm p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white">Nuevo grupo</h2>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Nombre del grupo</label>
          <input
            autoFocus
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && nombre.trim() && onConfirm(nombre.trim())}
            placeholder="Ej: Vara 1, Cenitales, Frontales..."
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => nombre.trim() && onConfirm(nombre.trim())}
            className="px-4 py-2 text-sm bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 transition-colors"
          >
            Crear grupo
          </button>
        </div>
      </div>
    </div>
  )
}

// Panel lateral de detalle — vista de solo lectura con acceso directo a editar.
// Se abre al hacer click en el nombre de la luminaria en la tabla.
function PanelDetalle({ lum, gobo, onEditar, onCerrar }) {
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-800 border-l border-gray-700 shadow-2xl z-40 flex flex-col">
      {/* Encabezado */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 shrink-0">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Luminaria #{lum.numero}</p>
          <h2 className="text-lg font-semibold text-white">{lum.nombre || 'Sin nombre'}</h2>
        </div>
        <button onClick={onCerrar} className="text-gray-500 hover:text-white text-xl leading-none transition-colors">×</button>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Tipo</span>
          <span className="text-sm text-white flex items-center gap-2">
            {lum.tipo || '—'}
            {lum.esRobotica && <span className="text-xs text-amber-400">● robótica</span>}
          </span>
        </div>

        {lum.nombreGrupo && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Grupo</span>
            <span className="text-sm text-white">{lum.nombreGrupo}</span>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Posición en el espacio</span>
          <span className="text-sm text-gray-300">{lum.posicion || '—'}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Color</span>
          {lum.tipoColor === 'fijo' ? (
            <span className="flex items-center gap-2 text-sm text-gray-300">
              <span className="inline-block w-4 h-4 rounded-full border border-gray-600 shrink-0"
                style={{ backgroundColor: lum.colorFijo.hex }} />
              {lum.colorFijo.nombre || lum.colorFijo.hex}
            </span>
          ) : lum.tipoColor === 'variable' ? (
            <span className="text-sm text-blue-400">Variable (se dicta por escena)</span>
          ) : (
            <span className="text-sm text-gray-500">Sin color</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Afoque / dirección</span>
          <span className="text-sm text-gray-300">{lum.afoque || '—'}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Gobo</span>
          {gobo ? (
            <div className="text-sm text-gray-300 flex flex-col gap-0.5">
              <span className="text-white">{gobo.nombre}</span>
              {(gobo.fabricante || gobo.codigoFabricante) && (
                <span className="text-xs text-gray-500">
                  {[gobo.fabricante, gobo.codigoFabricante].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-500">Sin gobo</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Notas</span>
          <span className="text-sm text-gray-300 whitespace-pre-wrap">{lum.notas || '—'}</span>
        </div>
      </div>

      {/* Acciones */}
      <div className="px-5 py-4 border-t border-gray-700 shrink-0">
        <button onClick={onEditar}
          className="w-full px-4 py-2 text-sm bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 transition-colors">
          Editar luminaria
        </button>
      </div>
    </div>
  )
}

export default function LuminariasList({ project, onUpdate }) {
  const [editando, setEditando] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  // IDs seleccionados con checkbox para agrupar
  const [seleccionados, setSeleccionados] = useState([])
  // Modal de nombre de grupo
  const [modalGrupo, setModalGrupo] = useState(false)
  // Grupos expandidos (set de grupoId)
  const [expandidos, setExpandidos] = useState(new Set())
  // Luminaria mostrada en el panel lateral de detalle (null = cerrado)
  const [detalleAbierto, setDetalleAbierto] = useState(null)

  const luminarias = project.luminarias ?? []
  const gobos = project.biblioteca?.gobos ?? []

  // Número siguiente para nueva luminaria (máximo + 1)
  const siguienteNumero = () => {
    if (luminarias.length === 0) return 1
    const numeros = luminarias.map((l) => Number(l.numero)).filter(Boolean)
    return Math.max(...numeros) + 1
  }

  // --- Selección ---
  const toggleSeleccion = (id) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const limpiarSeleccion = () => setSeleccionados([])

  // --- Agrupar ---
  // Solo se pueden agrupar luminarias sueltas (sin grupoId) o que ya pertenezcan
  // al mismo grupo. Por ahora: solo sueltas.
  const puedeAgrupar = seleccionados.length >= 2 &&
    seleccionados.every((id) => {
      const lum = luminarias.find((l) => l.id === id)
      return lum && !lum.grupoId
    })

  const handleCrearGrupo = (nombreGrupo) => {
    const grupoId = generateId()
    const nuevas = luminarias.map((l) =>
      seleccionados.includes(l.id)
        ? { ...l, grupoId, nombreGrupo }
        : l
    )
    onUpdate({ ...project, luminarias: nuevas })
    setModalGrupo(false)
    limpiarSeleccion()
    // Expandir el grupo recién creado
    setExpandidos((prev) => new Set([...prev, grupoId]))
  }

  // --- Desagrupar ---
  const handleDesagrupar = (grupoId) => {
    if (!confirm('¿Desagrupar estas luminarias? Conservarán sus datos individuales.')) return
    const nuevas = luminarias.map((l) =>
      l.grupoId === grupoId ? { ...l, grupoId: undefined, nombreGrupo: undefined } : l
    )
    onUpdate({ ...project, luminarias: nuevas })
    setExpandidos((prev) => {
      const s = new Set(prev)
      s.delete(grupoId)
      return s
    })
  }

  // --- Editar nombre del grupo ---
  const handleEditarNombreGrupo = (grupoId, nombreActual) => {
    const nuevo = prompt('Nuevo nombre del grupo:', nombreActual)
    if (!nuevo || !nuevo.trim() || nuevo.trim() === nombreActual) return
    const nuevas = luminarias.map((l) =>
      l.grupoId === grupoId ? { ...l, nombreGrupo: nuevo.trim() } : l
    )
    onUpdate({ ...project, luminarias: nuevas })
  }

  // --- Expandir/colapsar ---
  const toggleExpandido = (grupoId) => {
    setExpandidos((prev) => {
      const s = new Set(prev)
      s.has(grupoId) ? s.delete(grupoId) : s.add(grupoId)
      return s
    })
  }

  // --- Acciones de luminaria individual ---
  const handleNueva = () => {
    setEditando(null)
    setModalAbierto(true)
  }

  const handleEditar = (lum) => {
    setEditando(lum)
    setModalAbierto(true)
  }

  // Abre el panel lateral de solo lectura
  const handleVerDetalle = (lum) => setDetalleAbierto(lum)

  // Desde el panel de detalle: cierra el panel y abre el formulario de edición
  const handleEditarDesdeDetalle = () => {
    const lum = detalleAbierto
    setDetalleAbierto(null)
    handleEditar(lum)
  }

  const handleGuardar = (luminariasNuevas, goboNuevoPendiente) => {
    let nuevas
    if (editando) {
      nuevas = luminarias.map((l) =>
        l.id === luminariasNuevas[0].id ? luminariasNuevas[0] : l
      )
    } else {
      nuevas = [...luminarias, ...luminariasNuevas]
    }
    // Si se creó un gobo nuevo al vuelo desde el formulario, se persiste en la biblioteca
    const biblioteca = {
      colores: project.biblioteca?.colores ?? [],
      posiciones: project.biblioteca?.posiciones ?? [],
      gobos: project.biblioteca?.gobos ?? [],
    }
    const nuevaBiblioteca = goboNuevoPendiente
      ? { ...biblioteca, gobos: [...biblioteca.gobos, goboNuevoPendiente] }
      : biblioteca
    onUpdate({ ...project, luminarias: nuevas, biblioteca: nuevaBiblioteca })
    setModalAbierto(false)
    setEditando(null)
  }

  const handleEliminar = (id) => {
    if (!confirm('¿Eliminar esta luminaria? Esta acción no se puede deshacer.')) return
    onUpdate({ ...project, luminarias: luminarias.filter((l) => l.id !== id) })
  }

  // --- Construcción de filas para renderizar ---
  // Agrupa por grupoId, mantiene orden por número
  const ordenadas = [...luminarias].sort((a, b) => Number(a.numero) - Number(b.numero))

  // Construye estructura: lista de items que pueden ser luminaria suelta o cabecera de grupo
  const items = []
  const gruposVistos = new Set()

  for (const lum of ordenadas) {
    if (!lum.grupoId) {
      // Luminaria suelta
      items.push({ tipo: 'luminaria', lum })
    } else {
      if (!gruposVistos.has(lum.grupoId)) {
        gruposVistos.add(lum.grupoId)
        const miembros = ordenadas.filter((l) => l.grupoId === lum.grupoId)
        items.push({ tipo: 'grupo', grupoId: lum.grupoId, nombreGrupo: lum.nombreGrupo, miembros })
      }
    }
  }

  // Total de luminarias (individuales + miembros de grupos)
  const totalLuminarias = luminarias.length

  return (
    <div className="flex flex-col gap-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Luminarias</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {totalLuminarias} luminaria{totalLuminarias !== 1 ? 's' : ''} registrada{totalLuminarias !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Botón agrupar — visible solo si hay selección válida */}
          {seleccionados.length >= 2 && (
            puedeAgrupar ? (
              <button
                onClick={() => setModalGrupo(true)}
                className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-500 transition-colors"
              >
                Crear grupo ({seleccionados.length})
              </button>
            ) : (
              <span className="px-3 py-2 text-xs text-amber-400 self-center">
                Solo se pueden agrupar luminarias sueltas
              </span>
            )
          )}
          {seleccionados.length > 0 && (
            <button
              onClick={limpiarSeleccion}
              className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleNueva}
            className="px-4 py-2 bg-amber-500 text-black text-sm font-semibold rounded hover:bg-amber-400 transition-colors"
          >
            + Agregar luminaria
          </button>
        </div>
      </div>

      {/* Tabla */}
      {luminarias.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-sm">
          No hay luminarias registradas. Agrega la primera.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
                {/* Columna checkbox */}
                <th className="pb-2 pr-2 w-6"></th>
                <th className="pb-2 pr-2 w-12">#</th>
                <th className="pb-2 pr-4">Nombre</th>
                <th className="pb-2 pr-4">Grupo</th>
                <th className="pb-2 pr-4">Tipo</th>
                <th className="pb-2 pr-4">Posición</th>
                <th className="pb-2 pr-4">Color</th>
                <th className="pb-2 pr-4">Afoque</th>
                <th className="pb-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                if (item.tipo === 'luminaria') {
                  const lum = item.lum
                  const faltantes = camposAdvertencia(lum)
                  const estaSeleccionado = seleccionados.includes(lum.id)
                  return (
                    <FilaLuminaria
                      key={lum.id}
                      lum={lum}
                      faltantes={faltantes}
                      seleccionado={estaSeleccionado}
                      onToggleSeleccion={() => toggleSeleccion(lum.id)}
                      onVerDetalle={() => handleVerDetalle(lum)}
                      onEditar={() => handleEditar(lum)}
                      onEliminar={() => handleEliminar(lum.id)}
                    />
                  )
                }

                // Fila de grupo
                const { grupoId, nombreGrupo, miembros } = item
                const expandido = expandidos.has(grupoId)
                return [
                  // Fila cabecera del grupo
                  <tr
                    key={`grupo-${grupoId}`}
                    className="border-b border-gray-700 bg-gray-800/80"
                  >
                    {/* Sin checkbox en cabecera de grupo */}
                    <td className="py-2 pr-2" />
                    {/* Rango de números */}
                    <td className="py-2 pr-2">
                      <span className="text-gray-500 font-mono text-xs">
                        {miembros[0].numero}–{miembros[miembros.length - 1].numero}
                      </span>
                    </td>
                    {/* Nombre del grupo con botón expandir */}
                    <td className="py-2 pr-4" colSpan={2}>
                      <button
                        onClick={() => toggleExpandido(grupoId)}
                        className="flex items-center gap-2 text-white font-medium hover:text-amber-400 transition-colors"
                      >
                        <span className="text-gray-500 text-xs">{expandido ? '▾' : '▸'}</span>
                        <span>{nombreGrupo}</span>
                        <span className="text-xs text-gray-500 font-normal">
                          ({miembros.length} luminarias)
                        </span>
                      </button>
                    </td>
                    <td className="py-2 pr-4 text-gray-500 text-xs" colSpan={4}>
                      {/* Resumen: tipos únicos del grupo */}
                      {[...new Set(miembros.map((m) => m.tipo).filter(Boolean))].join(', ') || '—'}
                    </td>
                    {/* Acciones del grupo */}
                    <td className="py-2">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEditarNombreGrupo(grupoId, nombreGrupo)}
                          className="text-xs text-gray-400 hover:text-white transition-colors"
                        >
                          Renombrar
                        </button>
                        <button
                          onClick={() => handleDesagrupar(grupoId)}
                          className="text-xs text-red-500 hover:text-red-400 transition-colors"
                        >
                          Desagrupar
                        </button>
                      </div>
                    </td>
                  </tr>,

                  // Filas de miembros (si expandido)
                  ...(expandido
                    ? miembros.map((lum) => {
                        const faltantes = camposAdvertencia(lum)
                        const estaSeleccionado = seleccionados.includes(lum.id)
                        return (
                          <FilaLuminaria
                            key={lum.id}
                            lum={lum}
                            faltantes={faltantes}
                            seleccionado={estaSeleccionado}
                            onToggleSeleccion={() => toggleSeleccion(lum.id)}
                            onVerDetalle={() => handleVerDetalle(lum)}
                            onEditar={() => handleEditar(lum)}
                            onEliminar={() => handleEliminar(lum.id)}
                            esmiembro
                          />
                        )
                      })
                    : []),
                ]
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: formulario de luminaria */}
      {modalAbierto && (
        <LuminariaForm
          luminaria={editando}
          numero={siguienteNumero()}
          luminarias={luminarias}
          biblioteca={project.biblioteca}
          onSave={handleGuardar}
          onCancel={() => {
            setModalAbierto(false)
            setEditando(null)
          }}
        />
      )}

      {/* Modal: nombre del grupo */}
      {modalGrupo && (
        <ModalNombreGrupo
          onConfirm={handleCrearGrupo}
          onCancel={() => setModalGrupo(false)}
        />
      )}

      {/* Panel lateral: detalle de luminaria (solo lectura) */}
      {detalleAbierto && (
        <PanelDetalle
          lum={detalleAbierto}
          gobo={gobos.find((g) => g.id === detalleAbierto.gobo_id) ?? null}
          onEditar={handleEditarDesdeDetalle}
          onCerrar={() => setDetalleAbierto(null)}
        />
      )}

    </div>
  )
}

// Fila de luminaria individual (suelta o miembro de grupo)
function FilaLuminaria({ lum, faltantes, seleccionado, onToggleSeleccion, onVerDetalle, onEditar, onEliminar, esmiembro }) {
  return (
    <tr className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${esmiembro ? 'bg-gray-900/40' : ''}`}>
      {/* Checkbox */}
      <td className="py-2.5 pr-2">
        <input
          type="checkbox"
          checked={seleccionado}
          onChange={onToggleSeleccion}
          className="accent-amber-500 w-3.5 h-3.5 cursor-pointer"
        />
      </td>
      {/* Número + advertencia */}
      <td className="py-2.5 pr-2">
        <span className="flex items-center gap-1.5">
          {esmiembro && <span className="text-gray-600 text-xs">└</span>}
          <span className="text-gray-400 font-mono">{lum.numero}</span>
          {faltantes.length > 0 && <AdvertenciaIcon faltantes={faltantes} />}
        </span>
      </td>
      <td className="py-2.5 pr-4">
        <button onClick={onVerDetalle} className="text-white hover:text-amber-400 transition-colors text-left">
          {lum.nombre}
        </button>
      </td>
      {/* Columna grupo */}
      <td className="py-2.5 pr-4 text-gray-500 text-xs">
        {lum.nombreGrupo || '—'}
      </td>
      <td className="py-2.5 pr-4 text-gray-300">
        <span className="flex items-center gap-1.5">
          {lum.tipo || '—'}
          {lum.esRobotica && <span className="text-xs text-amber-400">● rob</span>}
        </span>
      </td>
      <td className="py-2.5 pr-4 text-gray-400 text-xs">{lum.posicion || '—'}</td>
      <td className="py-2.5 pr-4"><CeldaColor lum={lum} /></td>
      <td className="py-2.5 pr-4 text-gray-400 text-xs">{lum.afoque || '—'}</td>
      <td className="py-2.5">
        <div className="flex gap-2 justify-end">
          <button onClick={onEditar} className="text-xs text-gray-400 hover:text-white transition-colors">
            Editar
          </button>
          <button onClick={onEliminar} className="text-xs text-red-500 hover:text-red-400 transition-colors">
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  )
}