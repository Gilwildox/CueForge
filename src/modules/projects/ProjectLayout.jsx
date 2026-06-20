// Layout principal del proyecto — navegación entre módulos
import { useState } from 'react'
import ProjectMetadata from './ProjectMetadata'
import TechnicalSheet from '../technical/TechnicalSheet'
import LuminariasList from '../luminarias/LuminariasList'
import SceneManager from '../scenes/SceneManager'
import Library from '../library/Library'
import Budget from '../budget/Budget'
import Export from '../export/Export'

// Módulos disponibles en el menú lateral
const MODULES = [
  { id: 'metadata', label: 'Metadatos' },
  { id: 'technical', label: 'Ficha técnica' },
  { id: 'luminarias', label: 'Luminarias' },
  { id: 'scenes', label: 'Guion' },
  { id: 'library', label: 'Biblioteca' },
  { id: 'budget', label: 'Presupuesto' },
  { id: 'export', label: 'Exportar' },
]

export default function ProjectLayout({ project, onBack, onUpdate }) {
  const [activeModule, setActiveModule] = useState('metadata')

  // Renderiza el módulo activo
  const renderModule = () => {
    switch (activeModule) {
      case 'metadata':
        return <ProjectMetadata project={project} onUpdate={onUpdate} />
      case 'technical':
        return <TechnicalSheet project={project} onUpdate={onUpdate} />
      case 'luminarias':
        return <LuminariasList project={project} onUpdate={onUpdate} />
      case 'scenes':
        return <SceneManager project={project} onUpdate={onUpdate} />
      case 'library':
        return <Library project={project} onUpdate={onUpdate} />
      case 'budget':
        return <Budget project={project} onUpdate={onUpdate} />
      case 'export':
        return <Export project={project} />
      default:
        return <p className="text-gray-500">Módulo no disponible aún.</p>
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Barra lateral */}
      <aside className="w-56 bg-gray-950 flex flex-col sticky top-0 h-screen overflow-y-auto py-6 px-4 shrink-0">
        <div className="mb-6">
          <img src={`${import.meta.env.BASE_URL}logo-dark-bg.svg`} alt="CueForge" className="w-40 h-auto" />
        </div>

        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-white mb-6 text-left"
        >
          ← Proyectos
        </button>

        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
          Proyecto
        </p>
        <p className="text-sm font-semibold text-white mb-6 truncate">
          {project.metadatos.nombreObra || 'Sin título'}
        </p>

        <nav className="flex flex-col gap-1">
          {MODULES.map((mod) => (
            <button
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              className={`text-left px-3 py-2 rounded text-sm transition-colors ${
                activeModule === mod.id
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {mod.label}
            </button>
          ))}
        </nav>

        {/* Crédito — empujado al fondo del sidebar por mt-auto */}
        <div className="mt-auto pt-6 text-xs text-gray-500 border-t border-gray-800">
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
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 p-8 overflow-y-auto">
        {renderModule()}
      </main>
    </div>
  )
}