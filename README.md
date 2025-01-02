# Minesweepeers! 💣

A peer-to-peer minesweeper game! Try it out at: https://davidsarratgonzalez.github.io/minesweepeers

## How does it work?

The game is built as a React web application that runs entirely in the browser. It's a static website hosted on GitHub Pages, requiring no backend server to function. 

It uses WebRTC technology through the PeerJS library to enable direct peer-to-peer connections between players. Here's how it works:

1. When a player enters the game, they create a PeerJS instance which generates a unique ID
2. This ID can be shared with other players who want to join them and play together
3. When another player enters that ID, a direct peer-to-peer connection is established between both players
4. Each player shares their list of peer connections with their peers, which will then establish connections with each other, creating a network of interconnected peers
5. All game state and moves are synchronized in real-time through these direct connections
6. No central server is needed - the data flows directly between all connected players' browsers!

The only centralized component is the PeerJS broker server which helps establish the initial connection between peers. Once connected, all communication happens directly P2P.

**Note:** As this application operates over peer-to-peer connections, network conditions between players can influence gameplay behavior and responsiveness. The game implements mechanisms to handle network variability, but optimal performance depends on stable connections between peers.

## Features

- Direct browser-to-browser connections create a decentralized gameplay network
- Real-time synchronized game settings that players can customize collectively
- Built-in peer-to-peer chat system for real-time communication
- Live cursor position tracking shows where everyone is looking on the board

## License

This project is open-sourced under the MIT License - see the [LICENSE](LICENSE) file for details.
