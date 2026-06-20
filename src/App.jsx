// Componente raíz — maneja la navegación entre gestor y proyecto activo
import { useState } from 'react'
import { saveProject } from './db/database'
import ProjectManager from './modules/projects/ProjectManager'
import ProjectLayout from './modules/projects/ProjectLayout'

export default function App() {
  const [activeProject, setActiveProject] = useState(null)

  // Abre un proyecto y lo establece como activo
  const handleOpenProject = (project) => {
    setActiveProject(project)
  }

  // Regresa al gestor de proyectos
  const handleBackToManager = () => {
    setActiveProject(null)
  }

  // Actualiza el proyecto activo en memoria y persiste en IndexedDB
  const handleUpdateProject = async (updatedProject) => {
    setActiveProject(updatedProject)
    await saveProject(updatedProject)
  }

  if (!activeProject) {
    return <ProjectManager onOpenProject={handleOpenProject} />
  }

  return (
    <ProjectLayout
      project={activeProject}
      onBack={handleBackToManager}
      onUpdate={handleUpdateProject}
    />
  )
}