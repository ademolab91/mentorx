# User-Booking Management System

In an era where experts in various subjects are quite hard to come by, MentorX aims to connect individuals with specific knowledge and individuals who want to acquire the knowledge. MentorX is a mentorship management system that allows mentees to book the time of mentors. This is made possible through APIs for user registration, login, logout, mentor search, booking creation, booking retrieval, and booking management (reschedule, cancel, accept, reject). It is built using TypeScript, Azle and Express, and it leverages the Internet Computer's system in achieving decentralization.

## Features

- User Management:
  - User registration
  - User login
  - User logout
  - User retrieval
  - Mentor search by expertise

- Booking Management:
  - Booking creation
  - Booking retrieval
  - Booking rescheduling
  - Booking cancellation
  - Booking acceptance by mentor
  - Booking rejection by mentor

## Installation

To install the project, follow these steps:

1. Clone the repository.
2. Install dependencies using `npm install`.
3. Run the project using `dfx start --host 127.0.0.1:8000 --clean --background` then `dfx deploy`.

## Usage

Once the project is running, you can make HTTP requests to the exposed endpoints to perform user and booking management operations.

## API Endpoints

- `POST /register`: Register a new user.
- `POST /login`: Log in a user.
- `POST /logout/:userId`: Log out a user.
- `GET /users/:userId`: Retrieve user details.
- `POST /search`: Search for a mentor by expertise.
- `POST /book/:menteeId`: Create a booking for a mentee.
- `GET /bookings/:bookingId`: Retrieve a booking by its ID.
- `GET /users/:userId/bookings`: Retrieve bookings associated with a specific user.
- `PATCH /users/:userId/bookings/:bookingId/reschedule`: Reschedule a booking by a user.
- `PATCH /users/:userId/bookings/:bookingId/cancel`: Cancel a booking by a user.
- `PATCH /users/:userId/bookings/:bookingId/accept`: Accept a booking by a mentor.
- `PATCH /users/:userId/bookings/:bookingId/reject`: Reject a booking by a mentor.

## Example

Request:
    `curl -X http://<CANISTER_ID>.localhost:8000/register -H 'Accept: application/json -d '{"username": "John", "password": "john1234", "role": "mentor", "expertise": "ICP"}'`

Response:
    `{"message": "User registered successfully", "user": {"id": "fa42cef2-5062-4c4c-9b18-e720213ce19b", "role": "mentor", "expertise": "ICP", "username": "John", "password": "john1234", createdAt: "2024-04-03:00:00...", "updatedAt": "null"}}`

## Contributing

Contributions to the project are welcome. If you'd like to contribute, please fork the repository, create a new branch, make your changes, and submit a pull request.

## License

This project is licensed under the [License Name]. See the [LICENSE.md](LICENSE.md) file for details.

## Support

For any inquiries or support, please contact [kenharlbar](kenharlbar@gmail.com).