// Módulo 3 — Ficha técnica / Requerimientos del espacio
import { useState, useEffect } from 'react'
import { saveProject } from '../../db/database'

const STAGE_TYPES = [
  'Caja negra',
  'Teatro a la italiana',
  'Arena',
  'Thrust',
  'Foro abierto',
  'Otro',
]

export default function TechnicalSheet({ project, onUpdate }) {
  const [form, setForm] = useState(project.fichaTecnica)

  // Sincroniza si cambia el proyecto activo
  useEffect(() => {
    setForm(project.fichaTecnica)
  }, [project.id])

  // Autosave al cambiar cualquier campo
  const handleChange = async (field, value) => {
    const updated = { ...form, [field]: value }
    setForm(updated)
    const updatedProject = { ...project, fichaTecnica: updated }
    await saveProject(updatedProject)
    onUpdate(updatedProject)
  }

  // Agrega un campo extra
  const handleAddExtra = () => {
    const extras = [...(form.camposExtra || []), { etiqueta: '', valor: '' }]
    handleChange('camposExtra', extras)
  }

  // Edita un campo extra por índice
  const handleExtraChange = (index, key, value) => {
    const extras = form.camposExtra.map((campo, i) =>
      i === index ? { ...campo, [key]: value } : campo
    )
    handleChange('camposExtra', extras)
  }

  // Elimina un campo extra
  const handleRemoveExtra = (index) => {
    const extras = form.camposExtra.filter((_, i) => i !== index)
    handleChange('camposExtra', extras)
  }

  // Estilos reutilizables
  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
  const textareaClass = `${inputClass} resize-none`
  const labelClass = "block text-sm text-gray-400 mb-1"
  const sectionClass = "mb-8"
  const sectionTitleClass = "text-xs text-amber-500 uppercase tracking-widest mb-4 border-b border-gray-700 pb-2"

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Ficha técnica</h2>

      {/* SECCIÓN 1 — Espacio escénico */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>1. Espacio escénico</p>
        <div className="flex flex-col gap-4">

          <div>
            <label className={labelClass}>
              Tipo de escenario requerido <span className="text-amber-500">*</span>
            </label>
            <select
              value={form.tipoEscenario}
              onChange={(e) => handleChange('tipoEscenario', e.target.value)}
              className={inputClass}
            >
              <option value="">— Seleccionar —</option>
              {STAGE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className={labelClass}>
                Ancho mínimo <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                value={form.anchoMinimo}
                onChange={(e) => handleChange('anchoMinimo', e.target.value)}
                className={inputClass}
                placeholder="Ej: 8 m"
              />
            </div>
            <div className="flex-1">
              <label className={labelClass}>
                Fondo mínimo <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                value={form.fondoMinimo}
                onChange={(e) => handleChange('fondoMinimo', e.target.value)}
                className={inputClass}
                placeholder="Ej: 6 m"
              />
            </div>
            <div className="flex-1">
              <label className={labelClass}>
                Alto útil mínimo <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                value={form.altoMinimo}
                onChange={(e) => handleChange('altoMinimo', e.target.value)}
                className={inputClass}
                placeholder="Ej: 4 m"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Piso requerido</label>
            <input
              type="text"
              value={form.pisoRequerido}
              onChange={(e) => handleChange('pisoRequerido', e.target.value)}
              className={inputClass}
              placeholder="Ej: negro mate, madera, linóleo"
            />
          </div>

          <div>
            <label className={labelClass}>
              Drapería indispensable y cantidad <span className="text-amber-500">*</span>
            </label>
            <textarea
              value={form.draperia}
              onChange={(e) => handleChange('draperia', e.target.value)}
              rows={2}
              className={textareaClass}
              placeholder="Ej: 4 piernas negras, 2 bambalinas, ciclorama blanco"
            />
          </div>

          <div>
            <label className={labelClass}>
              Varas necesarias <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              value={form.varas}
              onChange={(e) => handleChange('varas', e.target.value)}
              className={inputClass}
              placeholder="Ej: 3 varas de iluminación + 1 vara de proscenio"
            />
          </div>

        </div>
      </div>

      {/* SECCIÓN 2 — Infraestructura eléctrica */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>2. Infraestructura eléctrica</p>
        <div className="flex flex-col gap-4">

          <div className="flex gap-4">
            <div className="flex-1">
              <label className={labelClass}>
                Circuitos regulados mínimos <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                value={form.circuitosMinimos}
                onChange={(e) => handleChange('circuitosMinimos', e.target.value)}
                className={inputClass}
                placeholder="Ej: 24 canales"
              />
            </div>
            <div className="flex-1">
              <label className={labelClass}>
                Potencia requerida <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                value={form.potenciaRequerida}
                onChange={(e) => handleChange('potenciaRequerida', e.target.value)}
                className={inputClass}
                placeholder="Ej: 12 kW / 220V trifásico"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Consola de iluminación <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              value={form.consola}
              onChange={(e) => handleChange('consola', e.target.value)}
              className={inputClass}
              placeholder="Ej: ETC Ion, MA2, compatible DMX512"
            />
          </div>

        </div>
      </div>

      {/* SECCIÓN 3 — Requerimientos especiales */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>3. Requerimientos técnicos especiales</p>
        <div className="flex flex-col gap-4">

          <div className="flex gap-4">
            <div className="flex-1">
              <label className={labelClass}>Followspots requeridos</label>
              <input
                type="text"
                value={form.followspots}
                onChange={(e) => handleChange('followspots', e.target.value)}
                className={inputClass}
                placeholder="Ej: 2 followspots"
              />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Hazer / máquina de humo</label>
              <input
                type="text"
                value={form.hazer}
                onChange={(e) => handleChange('hazer', e.target.value)}
                className={inputClass}
                placeholder="Ej: 1 hazer MDG"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Necesidades especiales</label>
            <textarea
              value={form.necesidadesEspeciales}
              onChange={(e) => handleChange('necesidadesEspeciales', e.target.value)}
              rows={3}
              className={textareaClass}
              placeholder="Requerimientos no cubiertos por otros campos"
            />
          </div>

        </div>
      </div>

      {/* SECCIÓN 4 — Operación y montaje */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>4. Operación y montaje</p>
        <div className="flex flex-col gap-4">

          <div className="flex gap-4">
            <div className="flex-1">
              <label className={labelClass}>
                Tiempo de montaje <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                value={form.tiempoMontaje}
                onChange={(e) => handleChange('tiempoMontaje', e.target.value)}
                className={inputClass}
                placeholder="Ej: 4 horas"
              />
            </div>
            <div className="flex-1">
              <label className={labelClass}>
                Tiempo de enfoque <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                value={form.tiempoEnfoque}
                onChange={(e) => handleChange('tiempoEnfoque', e.target.value)}
                className={inputClass}
                placeholder="Ej: 2 horas"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className={labelClass}>Tiempo de programación</label>
              <input
                type="text"
                value={form.tiempoProgramacion}
                onChange={(e) => handleChange('tiempoProgramacion', e.target.value)}
                className={inputClass}
                placeholder="Ej: 1 hora"
              />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Tiempo de ensayo</label>
              <input
                type="text"
                value={form.tiempoEnsayo}
                onChange={(e) => handleChange('tiempoEnsayo', e.target.value)}
                className={inputClass}
                placeholder="Ej: 3 horas"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className={labelClass}>
                Tiempo de desmontaje <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                value={form.tiempoDesmontaje}
                onChange={(e) => handleChange('tiempoDesmontaje', e.target.value)}
                className={inputClass}
                placeholder="Ej: 2 horas"
              />
            </div>
            <div className="flex-1">
              <label className={labelClass}>
                Personal local requerido <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                value={form.personalLocal}
                onChange={(e) => handleChange('personalLocal', e.target.value)}
                className={inputClass}
                placeholder="Ej: 1 técnico de audio, 2 tramoyas, 1 operador de consola"
              />
            </div>
          </div>

        </div>
      </div>

      {/* SECCIÓN 5 — Seguridad y observaciones */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>5. Seguridad y observaciones</p>
        <div className="flex flex-col gap-4">

          <div>
            <label className={labelClass}>Requisitos de seguridad</label>
            <textarea
              value={form.requisitosSeguidad}
              onChange={(e) => handleChange('requisitosSeguidad', e.target.value)}
              rows={2}
              className={textareaClass}
              placeholder="Condiciones necesarias para el montaje seguro"
            />
          </div>

          <div>
            <label className={labelClass}>Restricciones críticas</label>
            <textarea
              value={form.restriccionesCriticas}
              onChange={(e) => handleChange('restriccionesCriticas', e.target.value)}
              rows={2}
              className={textareaClass}
              placeholder="Condiciones que impedirían realizar la función"
            />
          </div>

          <div>
            <label className={labelClass}>Notas generales</label>
            <textarea
              value={form.notas}
              onChange={(e) => handleChange('notas', e.target.value)}
              rows={3}
              className={textareaClass}
              placeholder="Observaciones técnicas adicionales"
            />
          </div>

          {/* Campos extra */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Campos adicionales</label>
              <button
                onClick={handleAddExtra}
                className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              >
                + Agregar campo
              </button>
            </div>
            {(form.camposExtra || []).map((campo, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={campo.etiqueta}
                  onChange={(e) => handleExtraChange(index, 'etiqueta', e.target.value)}
                  className="w-1/3 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Etiqueta"
                />
                <input
                  type="text"
                  value={campo.valor}
                  onChange={(e) => handleExtraChange(index, 'valor', e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Valor"
                />
                <button
                  onClick={() => handleRemoveExtra(index)}
                  className="px-3 py-1 bg-red-900 hover:bg-red-700 rounded text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  )
}