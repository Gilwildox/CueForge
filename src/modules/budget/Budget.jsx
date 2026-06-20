// Módulo 7 — Presupuesto
// Registro de equipo requerido: provisto sin costo, en renta o en compra
import { useState } from 'react'
import { saveProject } from '../../db/database'
import { generateId } from '../../utils/helpers'

const ORIGENES = [
  { value: 'sinCosto', label: 'Provisto sin costo' },
  { value: 'renta', label: 'Renta' },
  { value: 'compra', label: 'Compra' },
]

const createEmptyItem = () => ({
  id: generateId(),
  cantidad: 1,
  equipo: '',
  marca: '',
  modelo: '',
  origen: 'renta',
  proveedor: '',
  contacto: '',
  costo: null,
  justificacion: '',
  notas: '',
})

const formatoMoneda = (n) =>
  n === null || n === undefined || n === ''
    ? '—'
    : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

// ---------------------------------------------------------------------------
// FormularioItem — alta/edición inline
// ---------------------------------------------------------------------------
function FormularioItem({ itemInicial, onGuardar, onCancelar }) {
  const [form, setForm] = useState(itemInicial?.id ? itemInicial : createEmptyItem())

  const cambiar = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }))

  const cambiarOrigen = (origen) => {
    // Si pasa a "sin costo", el costo no aplica — se limpia para evitar confusión en totales
    setForm((prev) => ({ ...prev, origen, costo: origen === 'sinCosto' ? null : prev.costo }))
  }

  const confirmar = () => {
    if (!form.equipo.trim()) return
    onGuardar({ ...form, equipo: form.equipo.trim() })
  }

  const etiquetaProveedor = form.origen === 'sinCosto' ? 'Entidad que provee' : 'Proveedor'

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Cantidad</label>
          <input type="number" min={1} value={form.cantidad}
            onChange={(e) => cambiar('cantidad', Math.max(1, parseInt(e.target.value) || 1))}
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
        </div>
        <div className="flex flex-col gap-1 col-span-3">
          <label className="text-xs text-gray-400">Equipo *</label>
          <input autoFocus type="text" value={form.equipo} onChange={(e) => cambiar('equipo', e.target.value)}
            placeholder="Ej: Consola de iluminación, Hazer, Vara telescópica..."
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Marca</label>
          <input type="text" value={form.marca} onChange={(e) => cambiar('marca', e.target.value)}
            placeholder="Ej: ETC, Chauvet..."
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Modelo</label>
          <input type="text" value={form.modelo} onChange={(e) => cambiar('modelo', e.target.value)}
            placeholder="Ej: Element 60"
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
        </div>
      </div>

      {/* Origen */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">Origen</label>
        <div className="flex gap-2">
          {ORIGENES.map((opt) => (
            <button key={opt.value} onClick={() => cambiarOrigen(opt.value)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                form.origen === opt.value
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">{etiquetaProveedor}</label>
          <input type="text" value={form.proveedor} onChange={(e) => cambiar('proveedor', e.target.value)}
            placeholder={form.origen === 'sinCosto' ? 'Ej: Teatro, producción...' : 'Nombre del proveedor'}
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Contacto</label>
          <input type="text" value={form.contacto} onChange={(e) => cambiar('contacto', e.target.value)}
            placeholder="Nombre, teléfono o correo"
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Costo</label>
          <input type="number" min={0} step="0.01"
            disabled={form.origen === 'sinCosto'}
            value={form.costo ?? ''}
            onChange={(e) => cambiar('costo', e.target.value === '' ? null : parseFloat(e.target.value))}
            placeholder={form.origen === 'sinCosto' ? 'No aplica' : 'Costo total'}
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-40 disabled:cursor-not-allowed" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">Justificación</label>
        <textarea rows={2} value={form.justificacion} onChange={(e) => cambiar('justificacion', e.target.value)}
          placeholder="Por qué se requiere este equipo / por qué renta o compra"
          className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">Notas</label>
        <textarea rows={2} value={form.notas} onChange={(e) => cambiar('notas', e.target.value)}
          placeholder="Detalles operativos: tiempos de entrega, condiciones, costo unitario si aplica..."
          className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none" />
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancelar}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">
          Cancelar
        </button>
        <button onClick={confirmar} disabled={!form.equipo.trim()}
          className="px-4 py-1.5 text-sm bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {itemInicial?.id ? 'Actualizar' : 'Agregar equipo'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TablaPresupuesto
// ---------------------------------------------------------------------------
function TablaPresupuesto({ items, onEditar, onEliminar }) {
  if (items.length === 0)
    return <p className="text-sm text-gray-500 py-4">No hay equipo registrado.</p>

  const totalRenta = items.filter((i) => i.origen === 'renta').reduce((sum, i) => sum + (i.costo || 0), 0)
  const totalCompra = items.filter((i) => i.origen === 'compra').reduce((sum, i) => sum + (i.costo || 0), 0)

  const etiquetaOrigen = (origen) => ORIGENES.find((o) => o.value === origen)?.label ?? origen

  return (
    <div className="flex flex-col gap-3">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
            <th className="py-2 pr-3 w-14">Cant.</th>
            <th className="py-2 pr-4">Equipo</th>
            <th className="py-2 pr-4">Marca / Modelo</th>
            <th className="py-2 pr-4">Origen</th>
            <th className="py-2 pr-4">Proveedor</th>
            <th className="py-2 pr-4">Contacto</th>
            <th className="py-2 pr-4 text-right">Costo</th>
            <th className="py-2 w-24"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800/30">
              <td className="py-2 pr-3 text-gray-300">{item.cantidad}</td>
              <td className="py-2 pr-4 text-white">{item.equipo}</td>
              <td className="py-2 pr-4 text-gray-400 text-xs">
                {[item.marca, item.modelo].filter(Boolean).join(' / ') || '—'}
              </td>
              <td className="py-2 pr-4 text-gray-400 text-xs">{etiquetaOrigen(item.origen)}</td>
              <td className="py-2 pr-4 text-gray-400 text-xs">{item.proveedor || '—'}</td>
              <td className="py-2 pr-4 text-gray-400 text-xs">{item.contacto || '—'}</td>
              <td className="py-2 pr-4 text-gray-300 text-right">
                {item.origen === 'sinCosto' ? '—' : formatoMoneda(item.costo)}
              </td>
              <td className="py-2 text-right whitespace-nowrap">
                <button onClick={() => onEditar(item)}
                  className="text-xs text-gray-400 hover:text-white transition-colors mr-3">Editar</button>
                <button onClick={() => onEliminar(item.id)}
                  className="text-xs text-red-600 hover:text-red-400 transition-colors">Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totales */}
      <div className="flex justify-end gap-6 pt-2 border-t border-gray-700 text-sm">
        <span className="text-gray-400">Total renta: <span className="text-white font-semibold">{formatoMoneda(totalRenta)}</span></span>
        <span className="text-gray-400">Total compra: <span className="text-white font-semibold">{formatoMoneda(totalCompra)}</span></span>
        <span className="text-gray-400">Total general: <span className="text-amber-400 font-semibold">{formatoMoneda(totalRenta + totalCompra)}</span></span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Budget — componente principal
// ---------------------------------------------------------------------------
export default function Budget({ project, onUpdate }) {
  const items = project.presupuesto ?? []
  const [editando, setEditando] = useState(null) // null | {} (nuevo) | objeto existente

  const persistir = async (proyectoActualizado) => {
    onUpdate(proyectoActualizado)
    await saveProject(proyectoActualizado)
  }

  const guardarItem = (item) => {
    const existe = items.some((i) => i.id === item.id)
    const nuevosItems = existe
      ? items.map((i) => (i.id === item.id ? item : i))
      : [...items, item]
    persistir({ ...project, presupuesto: nuevosItems })
    setEditando(null)
  }

  const eliminarItem = (id) => {
    if (!confirm('¿Eliminar este equipo del presupuesto? Esta acción no se puede deshacer.')) return
    persistir({ ...project, presupuesto: items.filter((i) => i.id !== id) })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Presupuesto</h1>
        <p className="text-sm text-gray-400 mt-0.5">Equipo requerido: provisto, en renta o en compra.</p>
      </div>

      {editando !== null ? (
        <FormularioItem
          itemInicial={editando}
          onGuardar={guardarItem}
          onCancelar={() => setEditando(null)}
        />
      ) : (
        <button onClick={() => setEditando({})}
          className="self-start px-4 py-1.5 text-sm bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 transition-colors">
          + Agregar equipo
        </button>
      )}

      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
        <TablaPresupuesto items={items} onEditar={setEditando} onEliminar={eliminarItem} />
      </div>
    </div>
  )
}