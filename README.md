# WhatsApp Campaign Frontend

A modern React TypeScript frontend for the WhatsApp Campaign Management System.

## Features

- **Authentication System**: Login/Register with JWT-based authentication
- **Role-Based Access Control**: Different permissions for super_admin, system_admin, organization_admin, and user roles
- **Organization Management**: Create, view, and configure organizations with WhatsApp Business API settings
- **Responsive Design**: Mobile-first design that works on all devices
- **Modern UI**: Built with Tailwind CSS and Heroicons

## Tech Stack

- React 18 with TypeScript
- React Router for navigation
- Tailwind CSS for styling
- Axios for API calls
- Heroicons for icons

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend server running on port 3000

## Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (already created):
```env
REACT_APP_API_URL=http://localhost:3000/api
GENERATE_SOURCEMAP=false
```

## Running the Application

1. Start the development server:
```bash
npm start
```

2. Open your browser and navigate to `http://localhost:3001`


## Available Scripts

- `npm start` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm run eject` - Ejects from Create React App (not recommended)

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── Layout.tsx      # Main layout with sidebar
│   └── ProtectedRoute.tsx # Route protection component
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication context
├── pages/              # Page components
│   ├── Dashboard.tsx   # Main dashboard
│   ├── Login.tsx       # Login page
│   ├── Register.tsx    # Registration page
│   └── Organizations.tsx # Organization management
├── services/           # API services
│   └── api.ts          # API client with interceptors
├── types/              # TypeScript type definitions
│   ├── auth.ts         # Authentication types
│   └── organization.ts # Organization types
├── App.tsx             # Main app component with routing
├── index.tsx           # App entry point
└── index.css           # Global styles with Tailwind
```

## API Integration

The frontend integrates with the backend API running on port 3000. Key features:

- Automatic JWT token refresh
- Request/response interceptors
- Error handling with user-friendly messages
- Role-based API access

## Pages and Features

### Login Page (`/login`)
- Email/password authentication
- Password visibility toggle
- Automatic redirect after login
- Error handling

### Register Page (`/register`)
- User registration form
- Organization selection
- Password confirmation
- Form validation

### Dashboard (`/dashboard`)
- Overview statistics
- Recent activity feed
- Quick action buttons
- Role-based content

### Organizations (`/organizations`)
- List all organizations
- Create new organizations
- WhatsApp Business API configuration
- Role-based permissions (admin only)

## Environment Variables

- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:3000/api)
- `GENERATE_SOURCEMAP` - Generate source maps for debugging (default: false)

## Building for Production

```bash
npm run build
```

This creates a `build` folder with optimized production files.

## Troubleshooting

1. **API Connection Issues**: Ensure the backend server is running on port 3000
2. **Authentication Issues**: Check that JWT tokens are being stored in localStorage
3. **CORS Issues**: Verify CORS settings in the backend configuration
4. **Build Issues**: Clear node_modules and reinstall dependencies

## Contributing

1. Follow the existing code structure and naming conventions
2. Use TypeScript for all new components
3. Add proper error handling and loading states
4. Test on both mobile and desktop devices
5. Follow the established authentication patterns
