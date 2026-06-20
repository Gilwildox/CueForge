// Formulario modal para agregar o editar una luminaria individual
import { useState, useEffect } from 'react'
import {
  createEmptyLuminaria,
  generateId,
  TIPOS_LUMINARIA_BASE,
  TIPOS_ROBOTICA,
  getTiposExtra,
} from '../../utils/helpers'

export default function LuminariaForm({ luminaria, numero, luminarias, biblioteca, onSave, onCancel }) {
  const gobos = biblioteca?.gobos ?? []
  const [form, setForm] = useState(luminaria ?? createEmptyLuminaria(numero))
  const [numeroError, setNumeroError] = useState(false)
  // Controla si el tipo seleccionado es personalizado
  const [tipoPersonalizado, setTipoPersonalizado] = useState(false)
  // Cantidad de copias a multiplicar
  const [multiplicar, setMultiplicar] = useState(false)
  const [cantidad, setCantidad] = useState(2)
  // Creación de gobo nuevo al vuelo desde este formulario
  const [modoNuevoGobo, setModoNuevoGobo] = useState(false)
  const [nuevoGoboNombre, setNuevoGoboNombre] = useState('')
  const [goboNuevoPendiente, setGoboNuevoPendiente] = useState(null)

  // Tipos extra ya usados en el proyecto
  const tiposExtra = getTiposExtra(luminarias)
  const todosLosTipos = [...TIPOS_LUMINARIA_BASE, ...tiposExtra]

  useEffect(() => {
    const base = luminaria ?? createEmptyLuminaria(numero)
    setForm(base)
    setNumeroError(false)
    setTipoPersonalizado(
      base.tipo !== '' && !TIPOS_LUMINARIA_BASE.includes(base.tipo) && !tiposExtra.includes(base.tipo)
    )
    setModoNuevoGobo(false)
    setNuevoGoboNombre('')
    setGoboNuevoPendiente(null)
  }, [luminaria, numero])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (field === 'numero') setNumeroError(false)
  }

  const handleColorChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      colorFijo: { ...prev.colorFijo, [field]: value },
    }))
  }

  const handleTipo = (value) => {
    if (value === '__otro__') {
      setTipoPersonalizado(true)
      setForm((prev) => ({ ...prev, tipo: '', esRobotica: false }))
    } else {
      setTipoPersonalizado(false)
      setForm((prev) => ({
        ...prev,
        tipo: value,
        esRobotica: TIPOS_ROBOTICA.includes(value),
      }))
    }
  }

  // Colores fijos ya usados en otras luminarias
  const catalogoColores = luminarias
    .filter((l) => l.tipoColor === 'fijo' && l.colorFijo.nombre && l.id !== form.id)
    .reduce((acc, l) => {
      const existe = acc.find((c) => c.nombre === l.colorFijo.nombre)
      if (!existe) acc.push({ nombre: l.colorFijo.nombre, hex: l.colorFijo.hex })
      return acc
    }, [])

  const handleColorCatalogo = (color) => {
    setForm((prev) => ({
      ...prev,
      colorFijo: { nombre: color.nombre, hex: color.hex },
    }))
  }

  // Crea un gobo nuevo al vuelo: queda pendiente y se persiste en la
  // biblioteca al guardar el formulario, junto con la asignación a la luminaria
  const confirmarNuevoGobo = () => {
    if (!nuevoGoboNombre.trim()) return
    const nuevo = {
      id: generateId(),
      nombre: nuevoGoboNombre.trim(),
      fabricante: '',
      codigoFabricante: '',
      descripcion: '',
    }
    setGoboNuevoPendiente(nuevo)
    setForm((prev) => ({ ...prev, gobo_id: nuevo.id }))
    setModoNuevoGobo(false)
    setNuevoGoboNombre('')
  }

  const handleSubmit = () => {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio.')
    if (!form.tipo.trim()) return alert('El tipo es obligatorio.')

    const duplicado = luminarias.some(
      (l) => Number(l.numero) === Number(form.numero) && l.id !== form.id
    )
    if (duplicado) {
      setNumeroError(true)
      return
    }

    if (multiplicar && cantidad > 1) {
      const copias = []
      // La primera usa exactamente el número del formulario
      copias.push({ ...form, nombre: `${form.nombre} 1` })

      // Las siguientes parten desde el número del formulario + 1
      for (let i = 2; i <= cantidad; i++) {
        copias.push({
          ...structuredClone(form),
          id: generateId(),
          numero: Number(form.numero) + (i - 1),
          nombre: `${form.nombre} ${i}`,
        })
      }
      onSave(copias, goboNuevoPendiente)
    } else {
      onSave([form], goboNuevoPendiente)
    }
  }

  const selectValue = tipoPersonalizado
    ? '__otro__'
    : todosLosTipos.includes(form.tipo)
    ? form.tipo
    : ''

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-lg p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">

        <h2 className="text-lg font-semibold text-white">
          {luminaria ? 'Editar luminaria' : 'Nueva luminaria'}
        </h2>

        {/* Número y nombre */}
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 w-24">
            <label className="text-xs text-gray-400">Número</label>
            <input
              type="number"
              value={form.numero}
              onChange={(e) => handleChange('numero', parseInt(e.target.value) || 1)}
              className={`rounded px-2 py-1.5 text-sm w-full bg-gray-700 text-white ${
                numeroError ? 'ring-2 ring-red-500' : ''
              }`}
            />
            {numeroError && (
              <span className="text-xs text-red-400">Número ya existe</span>
            )}
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-gray-400">Nombre *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Ej: Frontal centro, Lateral izquierdo..."
              className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm w-full placeholder-gray-500"
            />
          </div>
        </div>

        {/* Tipo de luminaria */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Tipo de luminaria *</label>
          <select
            value={selectValue}
            onChange={(e) => handleTipo(e.target.value)}
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm"
          >
            <option value="">— Selecciona —</option>
            {/* Tipos base */}
            {TIPOS_LUMINARIA_BASE.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
            {/* Tipos extra usados en el proyecto */}
            {tiposExtra.length > 0 && (
              <>
                <option disabled>──────────</option>
                {tiposExtra.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </>
            )}
            <option value="__otro__">Otro...</option>
          </select>
          {tipoPersonalizado && (
            <input
              type="text"
              value={form.tipo}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tipo: e.target.value, esRobotica: false }))
              }
              placeholder="Escribe el tipo..."
              className="mt-1 bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500"
            />
          )}
          {form.esRobotica && (
            <span className="text-xs text-amber-400 mt-0.5">
              ✓ Se registrará como luminaria robótica
            </span>
          )}
        </div>

        {/* Posición en el espacio */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Posición en el espacio</label>
          <input
            type="text"
            value={form.posicion}
            onChange={(e) => handleChange('posicion', e.target.value)}
            placeholder="Ej: 1ª vara, Piso, Calle izquierda..."
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500"
          />
        </div>

        {/* Tipo de color */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Color</label>
          <div className="flex gap-2">
            {[
              { value: 'ninguno', label: 'Sin color' },
              { value: 'fijo', label: 'Color fijo' },
              { value: 'variable', label: 'Color variable' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleChange('tipoColor', opt.value)}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  form.tipoColor === opt.value
                    ? 'bg-amber-500 text-black font-semibold'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color fijo */}
        {form.tipoColor === 'fijo' && (
          <div className="flex flex-col gap-2">
            {catalogoColores.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Colores usados en este proyecto</label>
                <div className="flex flex-wrap gap-2">
                  {catalogoColores.map((color) => (
                    <button
                      key={color.nombre}
                      onClick={() => handleColorCatalogo(color)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs border transition-colors ${
                        form.colorFijo.nombre === color.nombre
                          ? 'border-amber-500 text-white'
                          : 'border-gray-600 text-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <span
                        className="inline-block w-3 h-3 rounded-full border border-gray-600 shrink-0"
                        style={{ backgroundColor: color.hex }}
                      />
                      {color.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Color</label>
                <input
                  type="color"
                  value={form.colorFijo.hex}
                  onChange={(e) => handleColorChange('hex', e.target.value)}
                  className="w-10 h-9 rounded cursor-pointer bg-gray-700 border-0"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-400">Nombre del color / mica</label>
                <input
                  type="text"
                  value={form.colorFijo.nombre}
                  onChange={(e) => handleColorChange('nombre', e.target.value)}
                  placeholder="Ej: R80, L201, Azul cielo..."
                  className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Afoque */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Afoque / dirección</label>
          <input
            type="text"
            value={form.afoque}
            onChange={(e) => handleChange('afoque', e.target.value)}
            placeholder="Ej: Centro escena, Lateral derecho..."
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500"
          />
        </div>

        {/* Gobo — disponible también en robóticas con gobo fijo, independiente de la rueda */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Gobo</label>
          {modoNuevoGobo ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                type="text"
                value={nuevoGoboNombre}
                onChange={(e) => setNuevoGoboNombre(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmarNuevoGobo()}
                placeholder="Nombre del gobo..."
                className="flex-1 bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500"
              />
              <button onClick={confirmarNuevoGobo} className="text-sm text-amber-400 hover:text-amber-300 px-1">✓</button>
              <button onClick={() => setModoNuevoGobo(false)} className="text-sm text-gray-500 hover:text-gray-300 px-1">✕</button>
            </div>
          ) : (
            <select
              value={form.gobo_id ?? ''}
              onChange={(e) => {
                if (e.target.value === '__nuevo__') { setModoNuevoGobo(true); return }
                handleChange('gobo_id', e.target.value === '' ? null : e.target.value)
              }}
              className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm"
            >
              <option value="">Sin gobo</option>
              {gobos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              {/* Gobo recién creado al vuelo: aún no existe en la biblioteca del proyecto
                  (se persiste hasta guardar el formulario completo), por lo que se agrega
                  aquí como opción visible para que el <select> lo refleje correctamente */}
              {goboNuevoPendiente && !gobos.some((g) => g.id === goboNuevoPendiente.id) && (
                <option value={goboNuevoPendiente.id}>{goboNuevoPendiente.nombre} (nuevo)</option>
              )}
              <option value="__nuevo__">+ Nuevo gobo...</option>
            </select>
          )}
        </div>

        {/* Notas */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Notas</label>
          <textarea
            value={form.notas}
            onChange={(e) => handleChange('notas', e.target.value)}
            placeholder="Modelo deseado, observaciones técnicas..."
            rows={2}
            className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm placeholder-gray-500 resize-none"
          />
        </div>

        {/* Multiplicar luminaria */}
        {!luminaria && (
          <div className="border-t border-gray-700 pt-4 flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={multiplicar}
                onChange={(e) => setMultiplicar(e.target.checked)}
                className="accent-amber-500 w-4 h-4"
              />
              <span className="text-sm text-gray-300">Crear varias luminarias iguales</span>
            </label>
            {multiplicar && (
              <div className="flex items-center gap-2 ml-6">
                <label className="text-xs text-gray-400">Cantidad:</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.min(20, Math.max(2, parseInt(e.target.value) || 2)))}
                  className="bg-gray-700 text-white rounded px-2 py-1 text-sm w-16"
                />
                <span className="text-xs text-gray-500">
                  Se numerarán consecutivamente a partir del #{form.numero}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 transition-colors"
          >
            {multiplicar && cantidad > 1 ? `Crear ${cantidad} luminarias` : 'Guardar'}
          </button>
        </div>

      </div>
    </div>
  )
}