// Módulo 2 — Metadatos del proyecto
import { useState, useEffect } from 'react'
import { saveProject } from '../../db/database'

export default function ProjectMetadata({ project, onUpdate }) {
  const [form, setForm] = useState(project.metadatos)

  // Sincroniza si cambia el proyecto activo
  useEffect(() => {
    setForm(project.metadatos)
  }, [project.id])

  // Autosave al cambiar cualquier campo
  const handleChange = async (field, value) => {
    const updated = { ...form, [field]: value }
    setForm(updated)
    const updatedProject = { ...project, metadatos: updated }
    await saveProject(updatedProject)
    onUpdate(updatedProject)
  }

  // Agrega un campo extra personalizado
  const handleAddExtra = () => {
    const extras = [...form.camposExtra, { etiqueta: '', valor: '' }]
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

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Metadatos del proyecto</h2>

      <div className="flex flex-col gap-4">

        {/* Nombre de la obra */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Nombre de la obra <span className="text-amber-500">*</span>
          </label>
          <input
            type="text"
            value={form.nombreObra}
            onChange={(e) => handleChange('nombreObra', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            placeholder="Título de la obra"
          />
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Dirección <span className="text-amber-500">*</span>
          </label>
          <input
            type="text"
            value={form.direccion}
            onChange={(e) => handleChange('direccion', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            placeholder="Nombre del director/a"
          />
        </div>

        {/* Producción */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Producción <span className="text-amber-500">*</span>
          </label>
          <input
            type="text"
            value={form.produccion}
            onChange={(e) => handleChange('produccion', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            placeholder="Compañía o productor responsable"
          />
        </div>

        {/* Diseño de iluminación */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Diseño de iluminación <span className="text-amber-500">*</span>
          </label>
          <input
            type="text"
            value={form.disenoIluminacion}
            onChange={(e) => handleChange('disenoIluminacion', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            placeholder="Nombre del diseñador/a"
          />
        </div>

        {/* Responsable técnico */}
        {/* Responsable técnico */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">
              Responsable técnico <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              value={form.responsableTecnico}
              onChange={(e) => handleChange('responsableTecnico', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              placeholder="Nombre completo"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">
              Contacto <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              value={form.contactoTecnico}
              onChange={(e) => handleChange('contactoTecnico', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              placeholder="Teléfono o correo"
            />
          </div>
        </div>

        {/* Duración y versión en la misma fila */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">
              Duración del espectáculo <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              value={form.duracion}
              onChange={(e) => handleChange('duracion', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              placeholder="Ej: 90 min sin intermedio"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">
              Versión / revisión <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              value={form.version}
              onChange={(e) => handleChange('version', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              placeholder="Ej: v1.0 / Rev. 3"
            />
          </div>
        </div>

        {/* Notas generales */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Notas generales
          </label>
          <textarea
            value={form.notasGenerales}
            onChange={(e) => handleChange('notasGenerales', e.target.value)}
            rows={4}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500 resize-none"
            placeholder="Información administrativa o artística relevante"
          />
        </div>

        {/* Campos extra */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-gray-400">Campos adicionales</label>
            <button
              onClick={handleAddExtra}
              className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              + Agregar campo
            </button>
          </div>

          {form.camposExtra.map((campo, index) => (
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
  )
}