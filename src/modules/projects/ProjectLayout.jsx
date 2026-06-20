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
  // Controla el panel deslizante en móvil. En escritorio (lg+) el sidebar
  // siempre está visible vía la clase lg:translate-x-0, este estado no aplica ahí.
  const [sidebarAbierto, setSidebarAbierto] = useState(false)

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

  // Selecciona un módulo y cierra el panel si está abierto en móvil
  const handleSeleccionarModulo = (id) => {
    setActiveModule(id)
    setSidebarAbierto(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">

      {/* Fondo oscuro al abrir el menú en móvil — toca para cerrar */}
      {sidebarAbierto && (
        <div
          onClick={() => setSidebarAbierto(false)}
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
        />
      )}

      {/* Barra lateral — estática en escritorio (lg+), panel deslizante en móvil */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-56 bg-gray-950 flex flex-col h-screen overflow-y-auto py-6 px-4 shrink-0 transform transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <img src={`${import.meta.env.BASE_URL}logo-dark-bg.svg`} alt="CueForge" className="w-40 h-auto" />
          {/* Botón cerrar — solo visible en móvil */}
          <button
            onClick={() => setSidebarAbierto(false)}
            className="text-gray-500 hover:text-white text-xl leading-none lg:hidden"
          >
            ×
          </button>
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
              onClick={() => handleSeleccionarModulo(mod.id)}
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

      {/* Columna de contenido: barra superior móvil + módulo activo */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior — solo visible debajo de lg, da acceso al menú */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-gray-950 border-b border-gray-800 sticky top-0 z-20">
          <button
            onClick={() => setSidebarAbierto(true)}
            aria-label="Abrir menú"
            className="text-gray-300 hover:text-white text-2xl leading-none"
          >
            ☰
          </button>
          <span className="text-sm font-semibold truncate">
            {project.metadatos.nombreObra || 'Sin título'}
          </span>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {renderModule()}
        </main>
      </div>
    </div>
  )
}