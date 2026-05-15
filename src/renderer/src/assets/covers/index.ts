import snakeCover      from './snake.svg'
import chessCover      from './chess.svg'
import battleshipCover from './battleship.svg'
import flappyCover     from './flappy.svg'

/** Maps builtin:// executable paths to their bundled cover image URLs. */
export const BUILTIN_COVERS: Record<string, string> = {
  'builtin://snake':      snakeCover,
  'builtin://chess':      chessCover,
  'builtin://battleship': battleshipCover,
  'builtin://flappy':     flappyCover,
}
