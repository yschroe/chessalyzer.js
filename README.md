# chessalyzer.js

A JavaScript library for batch analyzing chess games.

## Features

-   Batch process PGN files
-   Track statistics for each piece and tile
-   Generate heat maps out of the generated data

## Usage

-   npm install chessalyzer --save
-   import {Chessalyzer} from 'chessalyzer'

## Getting started

## Contribute

1. NPM install

## TODOs

-   Check functionality for non-lichess PGN files
-   Don't use ChessPiece class in both ChessTile and ChessBoard. Parsing ChessBoard to JSON creates unnecessary doubling of ChessPiece data
-   Write Mocha tests
-   Change dataMap to JSON obj.
