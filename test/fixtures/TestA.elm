module TestA where

import TestDependency.Foo
import Graphics.Element (..)
import Text (..)

main : Element
main = plainText "This should say 5: " -- ++ (show $ addStuff 2 3)