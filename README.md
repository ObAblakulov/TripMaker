# TripMaker 🗺️

An AI-powered trip planning mobile app built with React Native and Expo that helps users discover and plan personalized trips based on their preferences.

## Features

- **AI Trip Planning**: Uses OpenAI to suggest personalized locations based on user preferences
- **Custom Trip Builder**: Manually search and add locations with drag-and-drop reordering
- **Interactive Maps**: Google Maps integration with custom markers and route visualization
- **Location Search**: OpenStreetMap integration for finding nearby places
- **Real-time Location**: Uses device GPS for location-based recommendations

## Tech Stack

- **Frontend**: React Native, Expo
- **Maps**: Google Maps API, React Native Maps
- **AI**: OpenAI GPT-4o-mini
- **Location Services**: Expo Location, OpenStreetMap Nominatim
- **State Management**: React Context
- **Animations**: React Native Reanimated, Gesture Handler

## Prerequisites

- Node.js (v14 or higher)
- Expo CLI
- iOS Simulator or Android Emulator (or physical device)
- Google Maps API key
- OpenAI API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/TripMaker.git
cd TripMaker
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

4. Start the development server:
```bash
expo start
```

## API Keys Setup

### Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Maps SDK for iOS/Android
4. Create credentials (API key)
5. Add key to `.env` file

### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create account and navigate to API keys
3. Generate new secret key
4. Add key to `.env` file

## Project Structure

```
TripMaker/
├── main/
│   ├── Map.tsx              # Main map component
│   ├── PlanTripOptions.jsx  # Trip planning options modal
│   ├── CustomTrip.jsx       # Custom trip builder
│   ├── tripMaker.ts         # AI trip planning logic
│   ├── LocationsContext.tsx # State management
│   └── RouteCreator.jsx     # Route visualization component
├── .env                     # Environment variables (not in git)
├── app.config.js           # Expo configuration
└── package.json            # Dependencies
```

## Usage

1. **AI Trip Planning**:
   - Tap "Plan Trip" button
   - Choose "AI Planner"
   - Enter search queries (e.g., "restaurant, park, museum")
   - Set budget, time range, and distance preferences
   - AI will suggest optimized locations

2. **Custom Trip Planning**:
   - Tap "Plan Trip" button
   - Choose "Custom Trip"
   - Search and add locations manually
   - Drag to reorder stops
   - Save your custom trip
