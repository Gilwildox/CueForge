// Módulo 1 — Gestor de proyectos
import { useState, useEffect } from 'react'
import { getAllProjects, saveProject, deleteProject } from '../../db/database'
import { createEmptyProject, formatDate, generateId } from '../../utils/helpers'

export default function ProjectManager({ onOpenProject }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  // Carga todos los proyectos al montar el componente
  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    const data = await getAllProjects()
    setProjects(data)
    setLoading(false)
  }

  // Crea un proyecto nuevo vacío
  const handleNew = async () => {
    const project = createEmptyProject()
    await saveProject(project)
    onOpenProject(project)
  }

  // Duplica un proyecto existente
  const handleDuplicate = async (project) => {
    const copy = {
      ...structuredClone(project),
      id: generateId(),
      fechaCreacion: new Date().toISOString(),
      metadatos: {
        ...project.metadatos,
        nombreObra: `${project.metadatos.nombreObra} (copia)`,
      },
    }
    await saveProject(copy)
    await loadProjects()
  }

  // Elimina un proyecto con confirmación
  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este proyecto? Esta acción no se puede deshacer.')) return
    await deleteProject(id)
    await loadProjects()
  }

  // Exporta el proyecto como archivo JSON
  const handleExport = (project) => {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.metadatos.nombreObra || 'proyecto'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Importa un proyecto desde archivo JSON
  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const text = await file.text()
      try {
        const project = JSON.parse(text)
        project.id = generateId() // nuevo ID para evitar conflictos
        await saveProject(project)
        await loadProjects()
      } catch {
        alert('El archivo no es un proyecto válido de CueForge.')
      }
    }
    input.click()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      Cargando proyectos...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-8">
        <img src={`${import.meta.env.BASE_URL}logo-dark-bg.svg`} alt="CueForge" className="w-64 h-auto" />
        <div className="flex gap-3">
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Importar proyecto
          </button>
          <button
            onClick={handleNew}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded text-sm"
          >
            + Nuevo proyecto
          </button>
        </div>
      </div>

      {/* Lista de proyectos */}
      {projects.length === 0 ? (
        <div className="text-center text-gray-500 mt-24">
          <p className="text-lg">No hay proyectos aún.</p>
          <p className="text-sm mt-2">Crea un nuevo proyecto para comenzar.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between bg-gray-800 rounded-lg px-6 py-4 hover:bg-gray-700 transition-colors"
            >
              {/* Info del proyecto */}
              <div
                className="cursor-pointer flex-1"
                onClick={() => onOpenProject(project)}
              >
                <p className="text-lg font-semibold">
                  {project.metadatos.nombreObra || 'Sin título'}
                </p>
                <p className="text-sm text-gray-400">
                  {project.metadatos.disenoIluminacion || '—'} ·{' '}
                  {formatDate(project.fechaCreacion)}
                </p>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleDuplicate(project)}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                >
                  Duplicar
                </button>
                <button
                  onClick={() => handleExport(project)}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                >
                  Exportar
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="px-3 py-1 bg-red-900 hover:bg-red-700 rounded text-xs"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Crédito — anclado a la esquina inferior izquierda, mismo estilo que el sidebar del proyecto */}
      <div className="fixed bottom-6 left-8 text-xs text-gray-500">
        CueForge by{' '}
        <a
          href="https://www.instagram.com/gilberto_santacolomba/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-500 hover:text-amber-400 transition-colors"
        >
          Gilberto Santacolomba
        </a>
      </div>
    </div>
  )
}