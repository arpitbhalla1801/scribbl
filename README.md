# Scribbl - Online Drawing and Guessing Game

A real-time multiplayer drawing and guessing game built with Next.js, similar to Skribbl.io.

## Features

- Create and join game rooms with unique codes
- Real-time multiplayer gameplay
- Drawing canvas with various tools
- Word guessing with scoring system
- Configurable game settings (rounds, time, difficulty)
- Responsive design for desktop and mobile

## Backend Architecture

### API Routes

The backend is built using Next.js API routes located in `src/app/api/`:

#### Game Management
- `POST /api/games` - Create a new game room
- `GET /api/games/[roomId]` - Get game state
- `DELETE /api/games/[roomId]` - Remove player from game

#### Game Actions
- `POST /api/games/[roomId]/join` - Join an existing game
- `POST /api/games/[roomId]/start` - Start the game (host only)
- `POST /api/games/[roomId]/guess` - Submit a word guess
- `POST /api/games/[roomId]/draw` - Update drawing data

### Game State Management

The game state is managed in-memory using the `GameManager` class (`src/lib/gameManager.ts`):

- **Player Management**: Track players, scores, and host status
- **Round Management**: Handle game rounds, word selection, and timers
- **Drawing Sync**: Manage drawing data between players
- **Scoring System**: Calculate points based on guess timing and position

### Data Models

Key TypeScript interfaces defined in `src/lib/types.ts`:

- `GameState` - Complete game state including players, settings, and current round
- `Player` - Player information and status
- `GameSettings` - Configurable game parameters
- `DrawingStroke` - Drawing data structure

### Word System

Words are categorized by difficulty (easy/medium/hard) based on length:
- **Easy**: 4 characters or less
- **Medium**: 5-7 characters  
- **Hard**: 8+ characters

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open the application:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## How to Play

1. **Create a Game**: Set your name and game preferences
2. **Share Room Code**: Invite friends using the 6-character room code
3. **Start Playing**: Host starts the game when everyone has joined
4. **Draw & Guess**: Take turns drawing and guessing words
5. **Score Points**: Earn points for correct guesses and successful drawings

## Project Structure

```
src/
├── app/
│   ├── api/                 # Backend API routes
│   │   └── games/          # Game-related endpoints
│   ├── create/             # Create game page
│   ├── join/               # Join game page
│   ├── game/[roomId]/      # Game room page
│   └── results/[roomId]/   # Game results page
├── components/             # React components
├── lib/                    # Utilities and game logic
│   ├── gameManager.ts      # Core game state management
│   ├── gameAPI.ts          # Frontend API client
│   ├── types.ts            # TypeScript definitions
│   └── words.ts            # Word management utilities
└── words/                  # Word lists for the game
```

## Technologies Used

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React hooks + in-memory backend storage
- **API**: Next.js API routes

## Future Enhancements

- WebSocket integration for real-time updates
- Persistent storage with database
- Player authentication and profiles
- Room customization options
- Drawing tools and colors
- Chat system
- Mobile app development

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.
