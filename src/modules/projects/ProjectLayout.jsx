// Layout principal del proyecto — navegación entre módulos
// v2: sidebar colapsable en móvil (hamburger menu)
import { useState } from 'react'
import ProjectMetadata from './ProjectMetadata'
import TechnicalSheet from '../technical/TechnicalSheet'
import LuminariasList from '../luminarias/LuminariasList'
import SceneManager from '../scenes/SceneManager'
import Library from '../library/Library'
import Budget from '../budget/Budget'
import Export from '../export/Export'
import LightPlot from '../lightplot/LightPlot'

const MODULES = [
  { id: 'metadata',   label: 'Metadatos' },
  { id: 'technical',  label: 'Ficha técnica' },
  { id: 'luminarias', label: 'Luminarias' },
  { id: 'scenes',     label: 'Guion' },
  { id: 'library',    label: 'Biblioteca' },
  { id: 'budget',     label: 'Presupuesto' },
  { id: 'lightplot',  label: 'Plano' },
  { id: 'export',     label: 'Exportar' },
]

export default function ProjectLayout({ project, onBack, onUpdate }) {
  const [activeModule, setActiveModule] = useState('metadata')
  // Sidebar visible en móvil (en desktop siempre visible)
  const [sidebarAbierto, setSidebarAbierto] = useState(false)

  const esPlano = activeModule === 'lightplot'

  const renderModule = () => {
    switch (activeModule) {
      case 'metadata':   return <ProjectMetadata project={project} onUpdate={onUpdate} />
      case 'technical':  return <TechnicalSheet project={project} onUpdate={onUpdate} />
      case 'luminarias': return <LuminariasList project={project} onUpdate={onUpdate} />
      case 'scenes':     return <SceneManager project={project} onUpdate={onUpdate} />
      case 'library':    return <Library project={project} onUpdate={onUpdate} />
      case 'budget':     return <Budget project={project} onUpdate={onUpdate} />
      case 'lightplot':  return <LightPlot project={project} onUpdate={onUpdate} />
      case 'export':     return <Export project={project} />
      default:           return <p className="text-gray-500">Módulo no disponible.</p>
    }
  }

  const handleNavegar = (modId) => {
    setActiveModule(modId)
    setSidebarAbierto(false) // cierra en móvil al navegar
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">

      {/* Overlay oscuro en móvil cuando sidebar está abierto */}
      {sidebarAbierto && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarAbierto(false)}
        />
      )}

      {/* Sidebar — fijo en desktop, drawer en móvil */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30
        w-56 bg-gray-950 flex flex-col
        h-screen overflow-y-auto py-6 px-4 shrink-0
        transition-transform duration-200
        ${sidebarAbierto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="mb-6">
          <img src={`${import.meta.env.BASE_URL}logo-dark-bg.svg`} alt="CueForge" className="w-40 h-auto" />
        </div>

        {/* Botón cerrar en móvil */}
        <button
          onClick={() => setSidebarAbierto(false)}
          className="md:hidden self-end text-gray-500 hover:text-white mb-4 text-xl leading-none">
          ×
        </button>

        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-white mb-6 text-left">
          ← Proyectos
        </button>

        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Proyecto</p>
        <p className="text-sm font-semibold text-white mb-6 truncate">
          {project.metadatos.nombreObra || 'Sin título'}
        </p>

        <nav className="flex flex-col gap-1">
          {MODULES.map((mod) => (
            <button
              key={mod.id}
              onClick={() => handleNavegar(mod.id)}
              className={`text-left px-3 py-2 rounded text-sm transition-colors ${
                activeModule === mod.id
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              {mod.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 text-xs text-gray-500 border-t border-gray-800">
          CueForge by{' '}
          <a
            href="https://www.instagram.com/gilberto_santacolomba/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-500 hover:text-amber-400 transition-colors">
            Gilberto Santacolomba
          </a>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Barra superior móvil — hamburger + nombre del módulo */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-gray-950 border-b border-gray-800 shrink-0">
          <button
            onClick={() => setSidebarAbierto(true)}
            className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded hover:bg-gray-800 transition-colors"
            aria-label="Abrir menú">
            ☰
          </button>
          <span className="text-sm text-gray-300 font-medium">
            {MODULES.find((m) => m.id === activeModule)?.label ?? ''}
          </span>
        </div>

        {/* Módulo activo */}
        <main className={`flex-1 overflow-y-auto ${esPlano ? '' : 'p-4 md:p-8'}`}>
          {renderModule()}
        </main>
      </div>
    </div>
  )
}