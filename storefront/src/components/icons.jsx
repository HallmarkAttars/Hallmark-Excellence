// Shared benefit icons — single source of truth for every homepage icon
// strip (utility bar, BenefitsBar, WhyChooseUs, ValueBar). Sized via prop.

export function ShippingIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 5.5h12v10h-12z" />
      <path d="M14.5 9.5h3.4l3.1 3.1v2.9h-6.5" />
      <circle cx="6.5" cy="18.5" r="1.7" />
      <circle cx="17.5" cy="18.5" r="1.7" />
    </svg>
  )
}

export function AlcoholFreeIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.7s5.5 6 5.5 10.3a5.5 5.5 0 0 1-11 0C6.5 8.7 12 2.7 12 2.7Z" />
      <path d="M9.5 13.5h5" />
    </svg>
  )
}

export function QualityIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 15.5 8.5 21 9.5l-4.5 4.2L17.4 20 12 17l-5.4 3 1-6.3L3 9.5l5.5-1L12 3Z" />
    </svg>
  )
}

export function SecureIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8.4 7.5 10 4.3-1.6 7.5-5.4 7.5-10v-6L12 2.5Z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </svg>
  )
}

export function ReturnsIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3" />
      <path d="M3.5 3.5v4.7h4.7" />
    </svg>
  )
}

export function DropIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.8s6.2 6.5 6.2 10.4a6.2 6.2 0 0 1-12.4 0C5.8 9.3 12 2.8 12 2.8Z" />
      <path d="M9.2 13.5a3 3 0 0 0 2.2 2.8" />
    </svg>
  )
}

export function LeafIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20C4 10 10 4 20 4c0 10-6 16-16 16Z" />
      <path d="M4 20c4-6 8-10 12-12" />
    </svg>
  )
}

export function BoxIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" />
      <path d="M3.5 7.5 12 12l8.5-4.5" />
      <path d="M12 12v9" />
    </svg>
  )
}

export function RabbitIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.5 6.5a3.6 3.6 0 0 1 5 0c1.6.6 2.7 2 2.7 3.7 0 .6-.1 1.2-.4 1.8A4.8 4.8 0 0 1 17 21H7a4.8 4.8 0 0 1 .2-9 4 4 0 0 1 2.3-5.5Z" />
      <path d="M9.8 7.3c-1-2.6-3-2.9-4.1-1.6-.7 1.6.4 3.6 1.8 4.3" />
      <path d="M14.2 7.3c1-2.6 3-2.9 4.1-1.6.7 1.6-.4 3.6-1.8 4.3" />
    </svg>
  )
}
