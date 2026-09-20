// Símbolos SVG para el Light Plot
// Cada función recibe { fill, stroke } y retorna el contenido interno del <g> del símbolo.
// El símbolo se centra en el origen (0,0) para facilitar rotación con transform.
// Dimensiones de referencia: bounding box de ~40×40px por defecto.

// ---------------------------------------------------------------------------
// Mapa tipo CueForge → clave de símbolo
// Se usa para luminarias con tipo de la lista base.
// ---------------------------------------------------------------------------
export const TIPO_A_SIMBOLO = {
  'Elipsoidal':    'elipsoidal',
  'Fresnel':       'fresnel',
  'Par':           'par',
  'Robótica Spot': 'moving_spot',
  'Robótica Wash': 'moving_wash',
}

// ---------------------------------------------------------------------------
// Lista de símbolos disponibles para asignar a tipos personalizados
// ---------------------------------------------------------------------------
export const SIMBOLOS_DISPONIBLES = [
  { key: 'elipsoidal',   label: 'Elipsoidal (ERS)' },
  { key: 'fresnel',      label: 'Fresnel' },
  { key: 'par',          label: 'PAR' },
  { key: 'moving_spot',  label: 'Robótica Spot' },
  { key: 'moving_wash',  label: 'Robótica Wash' },
  { key: 'panel_led',    label: 'Panel LED' },
  { key: 'barra_led',    label: 'Barra LED / Strip' },
  { key: 'estrobo',      label: 'Estrobo / Flash' },
  { key: 'generico',     label: 'Genérico' },
]

// ---------------------------------------------------------------------------
// Color de relleno por defecto cuando la luminaria no tiene color asignado
// ---------------------------------------------------------------------------
export const COLOR_DEFAULT = '#4a9eff'

// ---------------------------------------------------------------------------
// Resuelve el color de relleno de la luminaria para el plano.
// Prioridad: colorFijo.hex → COLOR_DEFAULT
// ---------------------------------------------------------------------------
export const resolverColorLuminaria = (lum) => {
  if (lum.tipoColor === 'fijo' && lum.colorFijo?.hex) return lum.colorFijo.hex
  return COLOR_DEFAULT
}

// ---------------------------------------------------------------------------
// Resuelve la clave de símbolo para una luminaria.
// Si tiene símbolo asignado en el plano (symbolOverride) lo usa;
// si el tipo está en el mapa base lo resuelve; si no, retorna 'generico'.
// ---------------------------------------------------------------------------
export const resolverSimbolo = (lum, lightPlotData) => {
  const override = lightPlotData?.symbolOverrides?.[lum.id]
  if (override) return override
  return TIPO_A_SIMBOLO[lum.tipo] ?? 'generico'
}

// ---------------------------------------------------------------------------
// Renderizadores de símbolo SVG
// Cada uno retorna un string JSX-compatible (paths, circles, rects, etc.)
// Todos centrados en (0,0), dimensión base ~40px.
// stroke y fill se inyectan como props.
// ---------------------------------------------------------------------------

// Elipsoidal (ERS) — cuerpo trapezoidal + lente elíptica frontal
export const SimboloElipsoidal = ({ fill, stroke }) => (
  <g>
    {/* Cuerpo trapezoidal */}
    <polygon
      points="-20,-10 20,-10 14,10 -14,10"
      fill={fill}
      stroke={stroke}
      strokeWidth="1.5"
    />
    {/* Lente frontal elíptica */}
    <ellipse cx="0" cy="-13" rx="10" ry="4"
      fill={fill} stroke={stroke} strokeWidth="1.5" />
    {/* Línea de enfoque */}
    <line x1="-8" y1="-10" x2="8" y2="-10"
      stroke={stroke} strokeWidth="0.8" strokeDasharray="2,2" />
  </g>
)

// Fresnel — cuerpo circular con líneas de lente concéntrica
export const SimboloFresnel = ({ fill, stroke }) => (
  <g>
    <circle cx="0" cy="0" r="18" fill={fill} stroke={stroke} strokeWidth="1.5" />
    {/* Líneas de lente fresnel */}
    <circle cx="0" cy="0" r="6"  fill="none" stroke={stroke} strokeWidth="0.8" />
    <circle cx="0" cy="0" r="11" fill="none" stroke={stroke} strokeWidth="0.8" />
    <circle cx="0" cy="0" r="15" fill="none" stroke={stroke} strokeWidth="0.8" />
  </g>
)

// PAR — cuerpo rectangular + lente elíptica interior
export const SimboloPar = ({ fill, stroke }) => (
  <g>
    <rect x="-16" y="-16" width="32" height="32"
      fill={fill} stroke={stroke} strokeWidth="1.5" rx="2" />
    <ellipse cx="0" cy="0" rx="10" ry="12"
      fill="none" stroke={stroke} strokeWidth="1" />
    {/* Cruz de lente */}
    <line x1="-10" y1="0" x2="10" y2="0" stroke={stroke} strokeWidth="0.8" />
    <line x1="0" y1="-12" x2="0" y2="12" stroke={stroke} strokeWidth="0.8" />
  </g>
)

// Moving Spot — yoke + cuerpo rectangular + lente central
export const SimboloMovingSpot = ({ fill, stroke }) => (
  <g>
    {/* Yoke (soporte en U) */}
    <path d="M-16,-18 L-16,0 M16,-18 L16,0 M-16,-18 Q0,-24 16,-18"
      fill="none" stroke={stroke} strokeWidth="1.5" />
    {/* Cuerpo */}
    <rect x="-12" y="-2" width="24" height="20"
      fill={fill} stroke={stroke} strokeWidth="1.5" rx="1" />
    {/* Lente */}
    <circle cx="0" cy="6" r="6" fill="none" stroke={stroke} strokeWidth="1" />
    {/* Punto central lente */}
    <circle cx="0" cy="6" r="2" fill={stroke} />
  </g>
)

// Moving Wash — yoke + cuerpo redondeado + LEDs múltiples
export const SimboloMovingWash = ({ fill, stroke }) => (
  <g>
    {/* Yoke */}
    <path d="M-16,-18 L-16,0 M16,-18 L16,0 M-16,-18 Q0,-24 16,-18"
      fill="none" stroke={stroke} strokeWidth="1.5" />
    {/* Cuerpo redondeado */}
    <rect x="-12" y="-2" width="24" height="20"
      fill={fill} stroke={stroke} strokeWidth="1.5" rx="6" />
    {/* LEDs: matriz 3×2 */}
    {[-5,0,5].map((cx) =>
      [3,11].map((cy) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2"
          fill={stroke} stroke="none" />
      ))
    )}
  </g>
)

// Panel LED — rectángulo + matriz 3×2 de puntos LED
export const SimboloPanelLed = ({ fill, stroke }) => (
  <g>
    <rect x="-18" y="-14" width="36" height="28"
      fill={fill} stroke={stroke} strokeWidth="1.5" rx="2" />
    {/* Matriz 3×2 */}
    {[-9,0,9].map((cx) =>
      [-5,5].map((cy) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3"
          fill={stroke} stroke="none" opacity="0.8" />
      ))
    )}
  </g>
)

// Barra LED / Strip — rectángulo alargado + 5 LEDs en línea
export const SimboloBarraLed = ({ fill, stroke }) => (
  <g>
    <rect x="-28" y="-8" width="56" height="16"
      fill={fill} stroke={stroke} strokeWidth="1.5" rx="3" />
    {[-18,-9,0,9,18].map((cx) => (
      <circle key={cx} cx={cx} cy="0" r="3"
        fill={stroke} stroke="none" opacity="0.8" />
    ))}
  </g>
)

// Estrobo — rectángulo horizontal + 3 celdas de flash
export const SimboloEstrobo = ({ fill, stroke }) => (
  <g>
    <rect x="-24" y="-10" width="48" height="20"
      fill={fill} stroke={stroke} strokeWidth="1.5" rx="2" />
    {/* 3 celdas */}
    {[-14,0,14].map((cx) => (
      <rect key={cx} x={cx-8} y="-7" width="16" height="14"
        fill="none" stroke={stroke} strokeWidth="1" rx="1" />
    ))}
    {/* Separadores */}
    <line x1="-6" y1="-10" x2="-6" y2="10" stroke={stroke} strokeWidth="0.8" />
    <line x1="6"  y1="-10" x2="6"  y2="10" stroke={stroke} strokeWidth="0.8" />
  </g>
)

// Genérico — círculo con X (tipo desconocido)
export const SimboloGenerico = ({ fill, stroke }) => (
  <g>
    <circle cx="0" cy="0" r="16" fill={fill} stroke={stroke} strokeWidth="1.5" />
    <line x1="-9" y1="-9" x2="9" y2="9" stroke={stroke} strokeWidth="1.5" />
    <line x1="9" y1="-9" x2="-9" y2="9" stroke={stroke} strokeWidth="1.5" />
  </g>
)

// ---------------------------------------------------------------------------
// Mapa de componentes por clave — usado por el canvas para renderizar
// ---------------------------------------------------------------------------
export const SIMBOLOS_MAP = {
  elipsoidal:  SimboloElipsoidal,
  fresnel:     SimboloFresnel,
  par:         SimboloPar,
  moving_spot: SimboloMovingSpot,
  moving_wash: SimboloMovingWash,
  panel_led:   SimboloPanelLed,
  barra_led:   SimboloBarraLed,
  estrobo:     SimboloEstrobo,
  generico:    SimboloGenerico,
}

// ---------------------------------------------------------------------------
// Dimensión de bounding box por símbolo (para detectar clics y selección)
// ---------------------------------------------------------------------------
export const SIMBOLO_BBOX = {
  elipsoidal:  { w: 40, h: 28 },
  fresnel:     { w: 36, h: 36 },
  par:         { w: 32, h: 32 },
  moving_spot: { w: 32, h: 42 },
  moving_wash: { w: 32, h: 42 },
  panel_led:   { w: 36, h: 28 },
  barra_led:   { w: 56, h: 16 },
  estrobo:     { w: 48, h: 20 },
  generico:    { w: 32, h: 32 },
}
