# Treat Map Backend

This is the backend server for the Treat Map application, which allows users to find and share information about treat providers during Halloween or similar events.

## Table of Contents

- [Technologies Used](#technologies-used)
- [Dependencies](#dependencies)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Build Process](#build-process)
- [Running the Application](#running-the-application)
- [What to Expect](#what-to-expect)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [File Upload](#file-upload)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Contributing](#contributing)

## Technologies Used

- Node.js
- Express.js
- PostgreSQL
- JSON Web Tokens (JWT) for authentication
- Bcrypt for password hashing
- Cloudinary for image storage
- Mapbox for geocoding

## Dependencies 

This project requires the following dependencies:

### Main Dependencies
- express: Web application framework for Node.js
- pg: PostgreSQL client for Node.js
- bcryptjs: Library for hashing passwords
- jsonwebtoken: For creating and verifying JSON Web Tokens
- cors: Middleware to enable CORS (Cross-Origin Resource Sharing)
- dotenv: To load environment variables from a .env file
- @mapbox/mapbox-sdk: For geocoding functionality
- cloudinary: For image upload and management
- multer: Middleware for handling multipart/form-data (file uploads)
- multer-storage-cloudinary: Cloudinary storage engine for Multer

### Development Dependencies
- jest: Testing framework
- supertest: HTTP assertions for testing Node.js HTTP servers
- nodemon: Utility that monitors for any changes in your source and automatically restarts your server

### Installation

To install the dependencies, run the following commands:

``bash
# Install main dependencies
npm install express pg bcryptjs jsonwebtoken cors dotenv @mapbox/mapbox-sdk cloudinary multer multer-storage-cloudinary

# Install development dependencies
npm install --save-dev jest supertest nodemon

## Project Structure
The source code is organized as follows:

- `src/`: Contains the main application code
  - `routes/`: API route handlers
  - `middleware/`: Custom middleware functions
  - `config/`: Configuration files
  - `db/`: Database setup and queries
- `tests/`: Contains all test files
- `server.js`: Entry point of the application

## Setup

1. Clone the repository
2. Install dependencies:
3. Set up environment variables (see [Environment Variables](#environment-variables))
4. Set up the database (see [Database Setup](#database-setup))
5. Start the server:

## Build Process

This project doesn't require a traditional build process as it's a Node.js application. However, you should follow these steps to set up the project:

1. Install dependencies: `npm install`
2. Set up environment variables (see [Environment Variables](#environment-variables))
3. Set up the database (see [Database Setup](#database-setup))

## Running the Application

To start the server:

1. Run `npm start` for production or `npm run dev` for development mode
2. The server will start on the port specified in your .env file (default 3001)
3. You should see a console message indicating that the server is running

## What to Expect

When the server is running:
- The API endpoints will be available at `http://localhost:3001` (or your specified port)
- You can test the API using tools like Postman or curl
- Any console.log statements in your code will appear in the terminal where you started the server
- If you're running in dev mode, the server will restart automatically when you make changes to the code

## Environment Variables

Create a `.env` file in the root directory and add the following variables:

PORT=3001
SECRET_KEY=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token

## Database Setup

The application uses PostgreSQL. Make sure you have PostgreSQL installed and running.

1. Create a database named `treatdb`
2. The tables will be automatically created when you start the server for the first time

## API Endpoints

### User Routes
- POST `/users/signup`: Register a new user
- POST `/users/login`: Log in a user
- GET `/users/users`: Get all users (requires authentication)
- PUT `/users/user/treatprovider`: Update user's treat provider status (requires authentication)
- PUT `/users/change-password/101`: Change user's password (requires authentication)
- DELETE `/users/users/:userId`: Delete a user (requires authentication)


### Treat Provider Routes
- POST `/treatproviders/treatproviders`: Add a new treat provider (requires authentication)
- GET `/treatproviders/treatproviders`: Get all treat providers
- GET `/treatproviders/treatproviders/:id`: Get a single treat provider
- GET `/treatproviders/treatprovidersfilter`: Advanced search and filter for treat providers
- PUT `/treatproviders/treatproviders`: Edit treat provider profile (requires authentication)

### Saved Houses Routes
- POST `/savedhouses/savedhouses`: Save a house for a user (requires authentication)
- GET `/savedhouses/savedhouses`: Get saved houses for a user (requires authentication)
- DELETE `/savedhouses/savedhouses/:treatProviderId`: Delete a saved house for a user (requires authentication)

## Authentication

The application uses JWT for authentication. Include the token in the Authorization header as a Bearer token for protected routes.

## File Upload

Image upload is handled using Multer and Cloudinary. The `upload` middleware in `cloudinaryConfig.js` handles the file upload process.

## Error Handling

The application includes centralized error handling middleware in `app.js`. Errors are logged to the console and a generic error message is sent to the client.

## Testing
The application uses Jest for unit and integration testing.

Running Tests:
To run the tests, use the following command:
npm test
This will run all test suites and display the results in the console.

Test Files
The test files are located in the tests directory:

userRoutes.test.js: Tests for user-related routes
treatProviderRoutes.test.js: Tests for treat provider routes
savedHousesRoutes.test.js: Tests for saved houses routes

Test Setup

The jest.setup.js file in the project root contains global setup and teardown logic for the tests.
The setup.js file in the tests directory contains test-specific setup logic.

Database Handling in Tests
Tests use a separate test database to avoid interfering with development or production data. The database connection is automatically closed after all tests have run.
Mocking
External services (like Cloudinary and Mapbox) are mocked in the tests to avoid making real API calls during testing.

## Contributing
When contributing to this project, please ensure that all new features or changes are covered by appropriate tests. Run the existing test suite and make sure all tests pass before submitting a pull request.
