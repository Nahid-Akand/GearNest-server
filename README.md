# GearNest - Backend Server

GearNest is an equipment rental marketplace that connects equipment owners with customers. This repository contains the backend REST API, built with Express.js, TypeScript, and MongoDB.

## Technologies Used

- Node.js
- Express.js 5
- TypeScript
- MongoDB Native Driver
- JWT Authentication
- Google Authentication
- Stripe Payment Integration
- ImgBB Image Hosting

## Main Features

### Authentication
- User registration and login
- JWT-based authentication
- Google authentication
- Role-based authorization
- Support for Customer, Owner, and Admin roles

### User Management
- View user profiles
- Update profile information
- Profile image management
- Default profile image for new users

### Equipment Management
- Add new equipment
- View approved equipment
- Update and delete owned equipment
- Equipment approval workflow
- Search and filter equipment
- Sort equipment by rental price and creation date

### Customer Features
- View personal rental bookings
- Manage favorite equipment
- View and update profile

### Owner Features
- Add equipment
- Manage personal equipment
- View rental bookings for owned equipment
- View and update profile

### Admin Features
- Manage users
- Review equipment submissions
- Approve or reject equipment
- Manage platform resources

### Booking and Payment
- Create rental bookings
- Manage booking status
- Stripe Checkout integration
- Payment verification through Stripe webhooks
- Store payment transaction records

## Installation

Clone the repository:

```bash
git clone YOUR_SERVER_REPOSITORY_URL
```

Navigate to the server directory:

```bash
cd GearNest-server
```

Install dependencies:

```bash
npm install
```

## Environment Variables

Create a `.env` file in the server root directory.

```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:3000

MONGODB_URI=your_mongodb_connection_string
DB_NAME=gearnest

JWT_SECRET=your_jwt_secret

GOOGLE_CLIENT_ID=your_google_client_id

STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

IMGBB_API_KEY=your_imgbb_api_key
```

Replace the placeholder values with your own credentials.

**Never commit your `.env` file to GitHub.**

## Run the Server

Start the development server:

```bash
npm run dev
```

The backend runs at:

```text
http://localhost:5001
```

## API Base URL

```text
http://localhost:5001/api/v1
```

## Project Structure

```text
GearNest-server/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── interfaces/
│   ├── types/
│   └── utils/
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

The actual folder structure may vary depending on the implementation.

## Security

- JWT authentication for protected routes
- Role-based access control
- Backend validation of rental and payment information
- Stripe webhook signature verification
- Environment variables for sensitive credentials
- Ownership checks for equipment and bookings

## Database

The application uses MongoDB.

Database name:

```text
gearnest
```

Main collections include:

- users
- equipment
- bookings
- favorites
- payments

## License

This project was developed as an equipment rental marketplace project.