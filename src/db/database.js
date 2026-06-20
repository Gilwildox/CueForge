// Configuración y apertura de la base de datos IndexedDB
import { openDB } from 'idb'

const DB_NAME = 'lightscript'
const DB_VERSION = 1

// Abre o crea la base de datos
export const initDB = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Almacén principal de proyectos
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' })
      }
    },
  })

// Obtener todos los proyectos
export const getAllProjects = async () => {
  const db = await initDB()
  return db.getAll('projects')
}

// Obtener un proyecto por ID
export const getProject = async (id) => {
  const db = await initDB()
  return db.get('projects', id)
}

// Guardar o actualizar un proyecto
export const saveProject = async (project) => {
  const db = await initDB()
  return db.put('projects', project)
}

// Eliminar un proyecto
export const deleteProject = async (id) => {
  const db = await initDB()
  return db.delete('projects', id)
}