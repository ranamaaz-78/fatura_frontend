import { barcodeGeometry, barcodeSymbolHeight } from '../../lib/barcode'
import { cn } from '../../lib/cn'

export type BarcodeSvgProps = {
  code: string
  className?: string
  /** Hide the human readable row on the tiny row-level marks. */
  digits?: boolean
}

export function BarcodeSvg({ code, className, digits = true }: BarcodeSvgProps) {
  const geometry = barcodeGeometry(code)

  // The caller already shows the code as text, so an unencodable one stays blank.
  if (!geometry) {
    return <span aria-hidden="true" className={cn('text-slate-300', className)} />
  }

  const height = digits ? geometry.height : barcodeSymbolHeight(geometry)

  return (
    <svg
      viewBox={`0 0 ${geometry.width} ${height}`}
      preserveAspectRatio={digits ? 'xMidYMid meet' : 'none'}
      role="img"
      aria-label={code}
      className={className}
    >
      {geometry.bars.map((bar) => (
        <rect key={bar.x} x={bar.x} y={0} width={bar.width} height={bar.height} fill="#0f172a" />
      ))}
      {digits
        ? geometry.digits.map((digit) => (
            <text
              key={`${digit.x}-${digit.text}`}
              x={digit.x}
              y={digit.y}
              textAnchor={digit.anchor}
              fontFamily="'JetBrains Mono', monospace"
              fontSize={geometry.fontSize}
              fill="#0f172a"
            >
              {digit.text}
            </text>
          ))
        : null}
    </svg>
  )
}
