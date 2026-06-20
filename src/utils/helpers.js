// Utilidades generales del proyecto

export const generateId = () => crypto.randomUUID()

export const formatDate = (isoDate) => {
  const date = new Date(isoDate)
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const createEmptyProject = () => ({
  id: generateId(),
  fechaCreacion: new Date().toISOString(),
  configuracion: {
    etiquetaCue: 'Cue',
  },
  metadatos: {
    nombreObra: '',
    direccion: '',
    produccion: '',
    disenoIluminacion: '',
    responsableTecnico: '',
    contactoTecnico: '',
    duracion: '',
    version: '',
    camposExtra: [],
    notasGenerales: '',
  },
  fichaTecnica: {
    tipoEscenario: '',
    anchoMinimo: '',
    fondoMinimo: '',
    altoMinimo: '',
    pisoRequerido: '',
    draperia: '',
    varas: '',
    circuitosMinimos: '',
    potenciaRequerida: '',
    consola: '',
    followspots: '',
    hazer: '',
    necesidadesEspeciales: '',
    tiempoMontaje: '',
    tiempoEnfoque: '',
    tiempoProgramacion: '',
    tiempoEnsayo: '',
    tiempoDesmontaje: '',
    personalLocal: '',
    requisitosSeguidad: '',
    restriccionesCriticas: '',
    camposExtra: [],
    notas: '',
  },
  luminarias: [],
  biblioteca: {
    colores: [],
    posiciones: [],
    gobos: [],
  },
  escenas: [],
  presupuesto: [],
})

// Tipos de luminaria base — no editables
export const TIPOS_LUMINARIA_BASE = [
  'Elipsoidal',
  'Fresnel',
  'Par',
  'Robótica Spot',
  'Robótica Wash',
]

// Tipos que implican robótica automáticamente
export const TIPOS_ROBOTICA = ['Robótica Spot', 'Robótica Wash']

// Fabricantes base de gobos — no editables
export const FABRICANTES_GOBO_BASE = ['Rosco', 'GAM', 'Apollo']

// Extrae fabricantes de gobo personalizados ya usados en la biblioteca del proyecto
export const getFabricantesGoboExtra = (gobos) => {
  const extras = gobos
    .map((g) => g.fabricante)
    .filter((f) => f && !FABRICANTES_GOBO_BASE.includes(f))
  return [...new Set(extras)]
}

// Extrae tipos personalizados usados en el proyecto
export const getTiposExtra = (luminarias) => {
  const extras = luminarias
    .map((l) => l.tipo)
    .filter((t) => t && !TIPOS_LUMINARIA_BASE.includes(t))
  return [...new Set(extras)]
}

// Crea la estructura base de una luminaria nueva
export const createEmptyLuminaria = (numero) => ({
  id: generateId(),
  numero,
  nombre: '',
  tipo: '',
  posicion: '',
  esGrupo: false,
  miembrosGrupo: [],
  tipoColor: 'ninguno',
  colorFijo: {
    nombre: '',
    hex: '#ffffff',
  },
  esRobotica: false,
  afoque: '',
  gobo_id: null,
  notas: '',
})

// Campos opcionales que disparan advertencia si están vacíos
export const camposAdvertencia = (luminaria) => {
  const faltantes = []
  if (!luminaria.posicion?.trim()) faltantes.push('Posición en el espacio')
  if (!luminaria.afoque?.trim()) faltantes.push('Afoque / dirección')
  return faltantes
}

// Resuelve el valor real de intensidad retrocediendo en escenas anteriores.
// null = no tocado en esa escena, sigue buscando. Default: 0.
export const resolverIntensidad = (escenas, escenaIndex, lumId) => {
  for (let i = escenaIndex; i >= 0; i--) {
    const estado = escenas[i].estados.find((e) => e.luminaria_id === lumId)
    if (estado && estado.intensidad !== null && estado.intensidad !== undefined) {
      return estado.intensidad
    }
  }
  return 0
}

// Resuelve color heredado.
// null = no tocado en esa escena (hereda). Solo retorna si hay un ID real (string truthy).
export const resolverColor = (escenas, escenaIndex, lumId) => {
  for (let i = escenaIndex; i >= 0; i--) {
    const estado = escenas[i].estados.find((e) => e.luminaria_id === lumId)
    if (estado && estado.color_id) {
      return estado.color_id
    }
  }
  return null
}

// Resuelve posición heredada.
// null = no tocado en esa escena (hereda). Solo retorna si hay un ID real (string truthy).
export const resolverPosicion = (escenas, escenaIndex, lumId) => {
  for (let i = escenaIndex; i >= 0; i--) {
    const estado = escenas[i].estados.find((e) => e.luminaria_id === lumId)
    if (estado && estado.posicion_id) {
      return estado.posicion_id
    }
  }
  return null
}

// Calcula los deltas de una escena respecto a la anterior (valores resueltos).
// Retorna array de { lumId, campo, anterior, nuevo }
export const calcularDeltas = (escenas, escenaIndex) => {
  const deltas = []
  const escena = escenas[escenaIndex]

  escena.estados.forEach((estado) => {
    const lumId = estado.luminaria_id

    // Delta de intensidad
    const intensidadAnterior =
      escenaIndex === 0 ? 0 : resolverIntensidad(escenas, escenaIndex - 1, lumId)
    const intensidadActual = resolverIntensidad(escenas, escenaIndex, lumId)
    if (intensidadActual !== intensidadAnterior) {
      deltas.push({ lumId, campo: 'intensidad', anterior: intensidadAnterior, nuevo: intensidadActual })
    }

    // Delta de color
    const colorAnterior =
      escenaIndex === 0 ? null : resolverColor(escenas, escenaIndex - 1, lumId)
    const colorActual = resolverColor(escenas, escenaIndex, lumId)
    if (colorActual !== colorAnterior) {
      deltas.push({ lumId, campo: 'color', anterior: colorAnterior, nuevo: colorActual })
    }

    // Delta de posición
    const posAnterior =
      escenaIndex === 0 ? null : resolverPosicion(escenas, escenaIndex - 1, lumId)
    const posActual = resolverPosicion(escenas, escenaIndex, lumId)
    if (posActual !== posAnterior) {
      deltas.push({ lumId, campo: 'posicion', anterior: posAnterior, nuevo: posActual })
    }
  })

  return deltas
}

// Genera el siguiente número de cue disponible
export const siguienteNumeroCue = (escenas) => {
  if (escenas.length === 0) return 1
  const numeros = escenas
    .map((e) => parseFloat(e.numero))
    .filter((n) => !isNaN(n))
  return Math.floor(Math.max(...numeros)) + 1
}

// Determina si una escena es "todo a cero" en intensidades.
// Se usa al guardar para calcular el flag automáticamente.
// Una escena es "todo a cero" si todas las luminarias resuelven intensidad 0.
export const calcularTodoACero = (escenas, escenaIndex, luminarias) => {
  if (luminarias.length === 0) return false
  return luminarias.every((lum) => resolverIntensidad(escenas, escenaIndex, lum.id) === 0)
}