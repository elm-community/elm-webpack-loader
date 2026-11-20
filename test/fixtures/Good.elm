module Good exposing (..)

import GoodDependency exposing ( add )
import Html exposing ( text )

addSquares x y = add (x^2) (y^2)

main = text (String.fromInt (addSquares 2 3))
