// Símbolos SVG para el Light Plot — v3
// Rediseño de Elipsoidal, Fresnel y PAR con mayor fidelidad a referencias.
// Todos centrados en (0,0).

export const TIPO_A_SIMBOLO = {
  'Elipsoidal':    'elipsoidal',
  'Fresnel':       'fresnel',
  'Par':           'par',
  'Robótica Spot': 'moving_spot',
  'Robótica Wash': 'moving_wash',
}

export const SIMBOLOS_DISPONIBLES = [
  { key: 'elipsoidal',   label: 'Elipsoidal' },
  { key: 'fresnel',      label: 'Fresnel' },
  { key: 'par',          label: 'PAR / Parcan' },
  { key: 'moving_spot',  label: 'Robótica Spot' },
  { key: 'moving_wash',  label: 'Robótica Wash' },
  { key: 'panel_led',    label: 'Panel LED' },
  { key: 'barra_led',    label: 'Barra LED / Strip' },
  { key: 'estrobo',      label: 'Estrobo / Flash' },
  { key: 'generico',     label: 'Genérico' },
]

// Color neutro para luminarias sin color asignado (tipoColor === 'ninguno')
// y como placeholder hasta que se elija color manualmente en el plano.
export const COLOR_NEUTRO  = '#f5f5f5'
export const COLOR_DEFAULT = '#4a9eff'

// Resuelve el color de relleno del símbolo. Prioridad:
// 1. colorFijo de la luminaria (si tipoColor === 'fijo', nunca se sobreescribe
//    por nada — ni colorOverride ni typeDefaults pueden contradecirlo)
// 2. colorOverride en la instancia (ajuste manual desde el inspector,
//    solo aplica a tipoColor variable)
// 3. color guardado en typeDefaults para ese tipo (solo aplica a variable)
// 4. COLOR_NEUTRO si tipoColor es 'ninguno' o 'variable' sin color aún asignado
// Los parámetros lightPlot e inst son opcionales para no romper llamadas existentes.
export const resolverColorLuminaria = (lum, lightPlot, inst) => {
  if (lum.tipoColor === 'fijo' && lum.colorFijo?.hex) return lum.colorFijo.hex
  if (lum.tipoColor !== 'variable') return COLOR_NEUTRO
  if (inst?.colorOverride) return inst.colorOverride
  const porTipo = lightPlot?.typeDefaults?.[lum.tipo]?.color
  if (porTipo) return porTipo
  return COLOR_NEUTRO
}

export const resolverSimbolo = (lum, lightPlotData) => {
  const override = lightPlotData?.symbolOverrides?.[lum.id]
  if (override) return override
  if (TIPO_A_SIMBOLO[lum.tipo]) return TIPO_A_SIMBOLO[lum.tipo]
  const porTipo = lightPlotData?.typeDefaults?.[lum.tipo]?.simbolo
  if (porTipo) return porTipo
  return 'generico'
}

// ---------------------------------------------------------------------------
// ELIPSOIDAL — cuerpo cilíndrico vertical con lente ensanchada en la base
// y soporte de gancho en la cima. Vista frontal estándar USITT.
// ---------------------------------------------------------------------------
export const SimboloElipsoidal = ({ fill, stroke }) => (
  <g>
    {/* Gancho de colgado */}
    <path d="M0,-32 L0,-24" stroke={stroke} strokeWidth="2" fill="none"/>
    <path d="M-8,-24 Q0,-30 8,-24" stroke={stroke} strokeWidth="2" fill="none"/>
    {/* Cuerpo cilíndrico */}
    <rect x="-8" y="-24" width="16" height="34" rx="2"
      fill={fill} stroke={stroke} strokeWidth="1.8"/>
    {/* Bridas de enfoque (tiras laterales) */}
    <rect x="-11" y="-10" width="4" height="8" rx="1"
      fill="none" stroke={stroke} strokeWidth="1.2"/>
    <rect x="7" y="-10" width="4" height="8" rx="1"
      fill="none" stroke={stroke} strokeWidth="1.2"/>
    {/* Cono/barril inferior */}
    <path d="M-8,10 L-14,24 L14,24 L8,10 Z"
      fill={fill} stroke={stroke} strokeWidth="1.8"/>
    {/* Lente frontal */}
    <line x1="-14" y1="24" x2="14" y2="24"
      stroke={stroke} strokeWidth="2.5"/>
  </g>
)

// ---------------------------------------------------------------------------
// FRESNEL — cuerpo trapezoidal ancho, lente circular con anillos concéntricos
// ---------------------------------------------------------------------------
export const SimboloFresnel = ({ fill, stroke }) => (
  <g>
    {/* Gancho */}
    <path d="M0,-30 L0,-22" stroke={stroke} strokeWidth="2" fill="none"/>
    <path d="M-7,-22 Q0,-28 7,-22" stroke={stroke} strokeWidth="2" fill="none"/>
    {/* Cuerpo trapezoidal — más ancho abajo */}
    <path d="M-8,-22 L-15,14 L15,14 L8,-22 Z"
      fill={fill} stroke={stroke} strokeWidth="1.8"/>
    {/* Lente fresnel con 3 anillos concéntricos */}
    <circle cx="0" cy="-4" r="11"
      fill={fill} stroke={stroke} strokeWidth="1.3"/>
    <circle cx="0" cy="-4" r="7.5"
      fill="none" stroke={stroke} strokeWidth="0.9"/>
    <circle cx="0" cy="-4" r="4"
      fill="none" stroke={stroke} strokeWidth="0.9"/>
    <circle cx="0" cy="-4" r="1.2"
      fill={stroke}/>
    {/* Base */}
    <line x1="-15" y1="14" x2="15" y2="14"
      stroke={stroke} strokeWidth="2.5"/>
  </g>
)

// ---------------------------------------------------------------------------
// PAR / PARCAN — vista frontal: asa en U, cuerpo cilíndrico ovalado, pie
// Referencia: la imagen subida muestra este diseño claramente
// ---------------------------------------------------------------------------
export const SimboloPar = ({ fill, stroke }) => (
  <g>
    {/* Asa en U */}
    <path d="M-11,-28 L-11,-16 Q-11,-8 0,-8 Q11,-8 11,-16 L11,-28"
      fill="none" stroke={stroke} strokeWidth="2"/>
    {/* Barra superior del asa */}
    <line x1="-14" y1="-28" x2="14" y2="-28"
      stroke={stroke} strokeWidth="3"/>
    {/* Cuerpo circular de la luminaria */}
    <ellipse cx="0" cy="6" rx="13" ry="15"
      fill={fill} stroke={stroke} strokeWidth="1.8"/>
    {/* Lente interior */}
    <ellipse cx="0" cy="6" rx="8" ry="10"
      fill="none" stroke={stroke} strokeWidth="1"/>
    {/* Punto central */}
    <circle cx="0" cy="6" r="2" fill={stroke}/>
    {/* Pie de montaje */}
    <line x1="0" y1="21" x2="0" y2="28"
      stroke={stroke} strokeWidth="2"/>
    <line x1="-9" y1="28" x2="9" y2="28"
      stroke={stroke} strokeWidth="3"/>
  </g>
)

// ---------------------------------------------------------------------------
// ROBÓTICA SPOT
// ---------------------------------------------------------------------------
export const SimboloMovingSpot = ({ fill, stroke }) => (
  <g>
    <rect x="-18" y="-32" width="36" height="8" rx="2"
      fill={fill} stroke={stroke} strokeWidth="1.5"/>
    {[-8,0,8].map((cx) => (
      <circle key={cx} cx={cx} cy="-28" r="1.5" fill={stroke}/>
    ))}
    <line x1="-18" y1="-28" x2="-18" y2="4" stroke={stroke} strokeWidth="2"/>
    <line x1="18"  y1="-28" x2="18"  y2="4" stroke={stroke} strokeWidth="2"/>
    <rect x="-14" y="-14" width="28" height="24" rx="2"
      fill={fill} stroke={stroke} strokeWidth="1.8"/>
    <circle cx="0" cy="-2" r="9" fill="none" stroke={stroke} strokeWidth="1.2"/>
    <circle cx="0" cy="-2" r="4" fill={stroke} opacity="0.6"/>
  </g>
)

// ---------------------------------------------------------------------------
// ROBÓTICA WASH
// ---------------------------------------------------------------------------
export const SimboloMovingWash = ({ fill, stroke }) => (
  <g>
    <rect x="-18" y="-32" width="36" height="8" rx="2"
      fill={fill} stroke={stroke} strokeWidth="1.5"/>
    <rect x="-8" y="-31" width="16" height="5" rx="1"
      fill="none" stroke={stroke} strokeWidth="0.8"/>
    <line x1="-18" y1="-28" x2="-18" y2="4" stroke={stroke} strokeWidth="2"/>
    <line x1="18"  y1="-28" x2="18"  y2="4" stroke={stroke} strokeWidth="2"/>
    <rect x="-14" y="-14" width="28" height="24" rx="6"
      fill={fill} stroke={stroke} strokeWidth="1.8"/>
    {[-7,0,7].map((cx) =>
      [-7,0,7].map((cy) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy-2} r="2.5"
          fill={stroke} opacity="0.7"/>
      ))
    )}
  </g>
)

export const SimboloPanelLed = ({ fill, stroke }) => (
  <g>
    <rect x="-18" y="-14" width="36" height="28" rx="2"
      fill={fill} stroke={stroke} strokeWidth="1.5"/>
    {[-9,0,9].map((cx) =>
      [-5,5].map((cy) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3"
          fill={stroke} opacity="0.8"/>
      ))
    )}
  </g>
)

export const SimboloBarraLed = ({ fill, stroke }) => (
  <g>
    <rect x="-28" y="-8" width="56" height="16" rx="3"
      fill={fill} stroke={stroke} strokeWidth="1.5"/>
    {[-18,-9,0,9,18].map((cx) => (
      <circle key={cx} cx={cx} cy="0" r="3" fill={stroke} opacity="0.8"/>
    ))}
  </g>
)

export const SimboloEstrobo = ({ fill, stroke }) => (
  <g>
    <rect x="-24" y="-10" width="48" height="20" rx="2"
      fill={fill} stroke={stroke} strokeWidth="1.5"/>
    {[-14,0,14].map((cx) => (
      <rect key={cx} x={cx-8} y="-7" width="16" height="14"
        fill="none" stroke={stroke} strokeWidth="1" rx="1"/>
    ))}
    <line x1="-6" y1="-10" x2="-6" y2="10" stroke={stroke} strokeWidth="0.8"/>
    <line x1="6"  y1="-10" x2="6"  y2="10" stroke={stroke} strokeWidth="0.8"/>
  </g>
)

export const SimboloGenerico = ({ fill, stroke }) => (
  <g>
    <circle cx="0" cy="0" r="16" fill={fill} stroke={stroke} strokeWidth="1.5"/>
    <line x1="-9" y1="-9" x2="9" y2="9" stroke={stroke} strokeWidth="1.5"/>
    <line x1="9" y1="-9" x2="-9" y2="9" stroke={stroke} strokeWidth="1.5"/>
  </g>
)

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

export const SIMBOLO_BBOX = {
  elipsoidal:  { w: 28, h: 58 },
  fresnel:     { w: 30, h: 58 },
  par:         { w: 28, h: 58 },
  moving_spot: { w: 36, h: 64 },
  moving_wash: { w: 36, h: 64 },
  panel_led:   { w: 36, h: 28 },
  barra_led:   { w: 56, h: 16 },
  estrobo:     { w: 48, h: 20 },
  generico:    { w: 32, h: 32 },
}