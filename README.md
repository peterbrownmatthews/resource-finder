# Community Resource Finder

A web application that helps homeless individuals find free food, clothing, and shelter in their local area using Google Maps integration.

## Features

- Interactive map interface
- Search for shelters, food banks, and clothing resources
- Real-time location-based results
- Detailed information about each resource
- Mobile-responsive design

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Google Maps API key

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with your Google Maps API key:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   PORT=3001
   ```

## Running the Application

1. Start the backend server:
   ```bash
   node server.js
   ```

2. In a new terminal, start the frontend development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## Security Notes

- The Google Maps API key is stored securely in environment variables
- API requests are proxied through the backend server to protect the API key
- CORS is properly configured for security

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
