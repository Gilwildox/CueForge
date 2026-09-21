// Botón de donación discreto — reutilizable en Inicio y en el sidebar del proyecto.
// El tooltip permanece visible si el mouse pasa del botón al tooltip (mismo
// contenedor relative con un solo onMouseEnter/onMouseLeave), y desaparece
// solo cuando el mouse sale de todo el bloque.
import { useState } from 'react'

export const DONATION_URL = 'https://link.mercadopago.com.mx/imthelight'

export const DONATION_MESSAGE =
  'CueForge nació de una necesidad que encontré en mi propio trabajo: tener una herramienta que hiciera más sencillo crear guiones de iluminación y organizar toda la información técnica de una obra. Si te ha ayudado a ahorrar tiempo o facilitar tu proyecto, puedes apoyar su desarrollo.'

// tooltipWidthClass permite ajustar el ancho del globo según el espacio
// disponible en cada lugar donde se usa (el sidebar es más angosto que la
// pantalla de inicio).
// size: 'sm' (default) — texto discreto, para sidebar del proyecto.
//       'lg' — botón tipo píldora, más notorio, para la pantalla de inicio.
export default function DonationLink({ tooltipWidthClass = 'w-56', size = 'sm' }) {
  const [abierto, setAbierto] = useState(false)

  const claseLink = size === 'lg'
    ? 'text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-amber-600/50 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10'
    : 'text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1'

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setAbierto(true)}
      onMouseLeave={() => setAbierto(false)}
    >
      <a
        href={DONATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={claseLink}
      >
        ☕ Apoya el proyecto
      </a>

      {abierto && (
        <div
          className={`absolute bottom-full left-0 mb-2 z-50 ${tooltipWidthClass} bg-gray-800 border border-gray-600 rounded-lg shadow-xl px-3 py-2.5`}
        >
          <p className="text-xs text-gray-300 leading-relaxed">{DONATION_MESSAGE}</p>
        </div>
      )}
    </div>
  )
}
