module Main exposing (..)

import Hello.World exposing (hello)
import Html exposing (text)


main : Html.Html a
main =
    text hello
