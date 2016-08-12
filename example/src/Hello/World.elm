module Hello.World exposing (hello)

import Hello.World.Content exposing (content)


hello : String
hello =
    "Hello, " ++ content
