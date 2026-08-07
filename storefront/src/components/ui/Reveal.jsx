import useInView from '../../hooks/useInView'
import './Reveal.css'

const ANIMATION_MAP = {
  'fade-up':     'reveal-fade-up',
  'fade-in':     'reveal-fade-in',
  'scale-in':    'reveal-scale-in',
  'slide-left':  'reveal-slide-left',
  'slide-right': 'reveal-slide-right',
  'slide-up':    'reveal-slide-up',
}

/**
 * Reveal — Animates children into view on scroll using IntersectionObserver.
 *
 * @param {Object}   props
 * @param {string}   [props.animation='fade-up']   — one of: fade-up, fade-in, scale-in, slide-left, slide-right
 * @param {number}   [props.delay=0]               — delay in ms (stagger support)
 * @param {number}   [props.duration=800]           — animation duration in ms
 * @param {string}   [props.as='div']               — wrapper element tag
 * @param {string}   [props.className='']           — additional classes
 * @param {Object}   [props.options]                — passed to useInView
 * @param {ReactNode} props.children
 */
export default function Reveal({
  children,
  animation = 'fade-up',
  delay = 0,
  duration = 800,
  as: Tag = 'div',
  className = '',
  options,
  ...rest
}) {
  const [ref, inView] = useInView(options)
  const animClass = ANIMATION_MAP[animation] || 'reveal-fade-up'

  return (
    <Tag
      ref={ref}
      className={`reveal ${animClass} ${inView ? 'is-visible' : ''} ${className}`.trim()}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`,
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
