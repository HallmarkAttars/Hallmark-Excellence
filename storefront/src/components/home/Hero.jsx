import CinematicHero from './CinematicHero'

/**
 * Hero component — renders the luxury CinematicHero with continuous brand
 * image transitions and Ken Burns camera movements.
 */
export default function Hero(props) {
  return <CinematicHero {...props} />
}

export { CinematicHero }
