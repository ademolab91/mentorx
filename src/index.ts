import { v4 as uuidv4 } from 'uuid';
import { Server, StableBTreeMap, ic } from 'azle';
import express from 'express';

/**
 * `usersStorage` - it's a key-value datastructure that is used to store users.
 * `bookingsStorage` - it's a key-value datastructure that is used to store bookings.
 * `loginData` - it's a key-value datastructure that is used to store user login sessions.
 * {@link StableBTreeMap} is a self-balancing tree that acts as a durable data storage that keeps data across canister upgrades.
 * For the sake of this contract we've chosen {@link StableBTreeMap} as a storage for the next reasons:
 * - `insert`, `get` and `remove` operations have a constant time complexity - O(1)
 * - data stored in the map survives canister upgrades unlike using HashMap where data is stored in the heap and it's lost after the canister is upgraded
 *
 * Breakdown of the `StableBTreeMap(string, User)` datastructure:
 * - the key of map is a `userId`
 * - the value in this map is a message itself `User` that is related to a given key (`userId`)
 *
 * Constructor values:
 * 1) 0 - memory id where to initialize a map.
 */

/**
 This type represents a user
 */
 class User {
   id: string;
   username: string;
   password: string;
   role: "mentor" | "mentee";
   expertise: "ALGORAND" | "SUI" | "ETHEREUM" | "ICP" | "BITCOIN" | "SOLIDITY" | "SOLANA" | null;
   createdAt: Date;
   updatedAt: Date | null
}

/**
 This type represents a booking information
 */
class Booking {
   id: string;
   mentorId: string;
   menteeId: string;
   date: Date;
   createdAt: Date;
   updatedAt: Date | null;
   startTime: string;
   endTime: string;
   status: "rescheduled" | "accepted" | "rejected" | "cancelled";
}

const usersStorage = StableBTreeMap<string, User>(0);
const loginData = StableBTreeMap<string, User>(1);
const bookingsStorage = StableBTreeMap<string, Booking>(2);

export default Server(() => {
   const app = express();
   app.use(express.json());

   // User management logic begins here
   app.post("/register", (req, res) => {
      /**
       * Registers a new user with the provided user information.
       * 
       * @param {Object} req - The request object containing user information in the request body.
       * @param {string} req.body.username - The username of the user to be registered.
       * @param {string} req.body.password - The password of the user to be registered.
       * @param {string} req.body.role - The role of the user to be registered (either "mentor" or "mentee").
       * @param {string} req.body.expertise - The expertise of the user to be registered (e.g., "Algorand", "Sui", "Ethereum", "ICP", "Bitcoin", "Solidity", "Solana").
       * @param {Object} res - The response object to send the registration status and user details.
       * 
       * @returns {Object} - The response containing the registration status and user details in JSON format.
       */
      const { username, password, role, expertise } = req.body;
      const user = new User();
      user.id = uuidv4();
      user.username = username;
      user.password = password;
      user.role = role;
      user.expertise = expertise;
      user.createdAt = getCurrentDate();
      user.updatedAt = null;
      usersStorage.insert(user.id, user);
      res.status(200).json({ message: "User registered successfully", user: user });
   })

   app.post("/login", (req, res) => {
      /**
       * Logs in a user with the provided username and password.
       * 
       * @param {Object} req - The request object containing the username and password in the request body.
       * @param {string} req.body.username - The username of the user trying to log in.
       * @param {string} req.body.password - The password of the user trying to log in.
       * @param {Object} res - The response object to send the login status and user details.
       * 
       * @returns {Object} - The response containing the login status and user details in JSON format.
       */
      const { username, password } = req.body;
      const user = usersStorage.values().filter(v => v.username === username)[0];
      if (user && user.password === password) {
         loginData.insert(user.id, user);
         res.status(200).json({ message: "User logged in successfully", user: user });
      } else {
         res.status(401).json({ message: "Invalid username or password" });
      }
   })

   app.post("/logout/:userId", (req, res) => {
      /**
       * Logs out a user by removing the login session from the `loginData` storage.
       * 
       * @param {Object} req - The request object containing the user id in the request parameters.
       * @param {string} req.params.userId - The id of the user to be logged out.
       * @param {Object} res - The response object to send the logout status.
       * 
       * @returns {Object} - The response containing the logout status in JSON format.
       */
      const { userId } = req.params;
      const deletedSession = loginData.remove(userId);
      if (deletedSession) {
         res.status(200).json({ message: "User logged out successfully" });
      } else {
         res.status(401).json({ message: "User not logged in" });
      }
   })

   app.get("/users/:userId", (req, res) => {
      /**
       * Logs out a user by removing the login session from the `loginData` storage.
       * 
       * @param {Object} req - The request object containing the user id in the request parameters.
       * @param {string} req.params.userId - The id of the user to be logged out.
       * @param {Object} res - The response object to send the logout status.
       * 
       * @returns {Object} - The response containing the logout status in JSON format.
       */
      const { userId } = req.params;
      const user = usersStorage.get(userId).Some;
      if (user) {
         res.status(200).json(user);
      } else {
         res.status(404).json({ message: "User not found" });
      }
   })

   // Search mentor by expertise
   app.post("/search", (req, res) => {
      /**
       * Searches for a mentor by expertise.
       * 
       * @param {Object} req - The request object containing the expertise in the request body.
       * @param {string} req.body.expertise - The expertise of the mentor to be searched.
       * @param {Object} res - The response object to send the search status and mentor details.
       * 
       * @returns {Object} - The response containing the search status and mentor details in JSON format.
       */
      const { expertise } = req.body;
      const mentors = usersStorage.values().filter(v => v.role === "mentor" && v.expertise === expertise.toUpperCase());
      if (mentors.length > 0) {
         res.status(200).json({ message: "Mentor(s) found", mentor: mentors[0] });
      } else {
         res.status(404).json({ message: "Mentor(s) not found" });
      }
   })
   // User management logic ends here

   // Booking management logic begins here
   app.post("/book/:menteeId", (req, res) => {
      /**
       * Handles the creation of a booking for a mentee with the provided booking information.
       * 
       * @param {Object} req - The request object containing the menteeId in the request parameters and booking information in the request body.
       * @param {string} req.params.menteeId - The id of the mentee for whom the booking is being created.
       * @param {string} req.body.mentorId - The id of the mentor for the booking.
       * @param {Date} req.body.date - The date of the booking.
       * @param {string} req.body.startTime - The start time of the booking.
       * @param {string} req.body.endTime - The end time of the booking.
       * @param {Object} res - The response object to send the booking creation status and booking details.
       * 
       * @returns {Object} - The response containing the booking creation status and booking details in JSON format.
       */
      const { menteeId } = req.params;
      // check if user is logged in
      const user = loginData.get(menteeId).Some;
      if (!user) {
         res.status(401).json({ message: "User is not logged in" });
      } else if (user.role !== "mentee") {
         res.status(401).json({ message: "User is not a mentee" });
      }
      const { mentorId, date, startTime, endTime } = req.body;
      const booking = new Booking();
      booking.id = uuidv4();
      booking.mentorId = mentorId;
      booking.menteeId = menteeId;
      booking.date = date;
      booking.startTime = startTime;
      booking.endTime = endTime;
      booking.status = "accepted";
      booking.createdAt = getCurrentDate();
      booking.updatedAt = null;
      bookingsStorage.insert(booking.id, booking);
      res.status(200).json({ message: "Booking created successfully", booking: booking });
   })

   app.get("/bookings/:bookingId", (req, res) => {
      /**
       * Retrieves a booking by its ID and sends the booking details in the response.
       * 
       * @param {Object} req - The request object containing the booking ID in the request parameters.
       * @param {string} req.params.bookingId - The ID of the booking to be retrieved.
       * @param {Object} res - The response object to send the booking details or a "Booking not found" message.
       * 
       * @returns {Object} - The response containing the booking details in JSON format if the booking is found, 
       * or a "Booking not found" message with status code 404 if the booking is not found.
       */
      const { bookingId } = req.params;
      const booking = bookingsStorage.get(bookingId).Some;
      if (booking) {
         res.status(200).json(booking);
      } else {
         res.status(404).json({ message: "Booking not found" });
      }
   })
   // Booking management logic ends here

   // User-Booking logic begins here
   app.get("/users/:userId/bookings", (req, res) => {
      /**
       * Retrieves bookings associated with a specific user and sends the booking details in the response.
       * 
       * @param {Object} req - The request object containing the user ID in the request parameters.
       * @param {string} req.params.userId - The ID of the user for whom the bookings are being retrieved.
       * @param {Object} res - The response object to send the booking details or a "User not found" message.
       * 
       * @returns {Object} - The response containing the booking details in JSON format if the user is found, 
       * or a "User not found" message with status code 404 if the user is not found.
       */
      const { userId } = req.params;
      const user = usersStorage.get(userId).Some;
      if (!user) {
         res.status(404).json({ message: "User not found" });
      }
      const bookings = Object.values(bookingsStorage.values()).find(booking => booking.menteeId === user?.id || booking.mentorId === user?.id);
      res.status(200).json(bookings);
   })

   app.patch("/users/:userId/bookings/:bookingId/reschedule", (req, res) => {
      /**
       * Handles the rescheduling of a booking by a user.
       * 
       * @param {Object} req - The request object containing the user and booking IDs in the request parameters, and the new date, start time, and end time in the request body.
       * @param {string} req.params.userId - The ID of the user initiating the reschedule request.
       * @param {string} req.params.bookingId - The ID of the booking to be rescheduled.
       * @param {Date} req.body.date - The new date for the booking.
       * @param {string} req.body.startTime - The new start time for the booking.
       * @param {string} req.body.endTime - The new end time for the booking.
       * @param {Object} res - The response object to send the rescheduling status and updated booking details.
       * 
       * @returns {Object} - The response containing the rescheduling status and updated booking details in JSON format if the reschedule is successful, 
       * or an "Unauthorized" message with status code 401 if the user is not authorized to reschedule the booking, 
       * or a "User not found" message with status code 404 if the user is not found, 
       * or a "Booking not found" message with status code 404 if the booking is not found.
       */
      const { userId, bookingId } = req.params;
      const { date, startTime, endTime } = req.body;
      const user = usersStorage.get(userId).Some;
      const booking = bookingsStorage.get(bookingId).Some;
      if (!user) {
         res.status(404).json({ message: "User not found" });
      }
      if (!booking) {
         res.status(404).json({ message: "Booking not found" });
      }
      if (user?.id === booking?.menteeId || user?.id === booking?.mentorId) {
         booking.date = date;
         booking.startTime = startTime;
         booking.endTime = endTime;
         booking.updatedAt = getCurrentDate();
         booking.status = "rescheduled";
         bookingsStorage.insert(booking.id, booking);
         res.status(200).json({ message: "Booking rescheduled successfully", booking: booking });
      } else {
         res.status(401).json({ message: "You are not authorized to reschedule this booking" });
      }
   })

   app.patch("/users/:userId/bookings/:bookingId/cancel", (req, res) => {
      /**
       * Handles the cancellation of a booking by a user.
       * 
       * @param {Object} req - The request object containing the user and booking IDs in the request parameters.
       * @param {string} req.params.userId - The ID of the user initiating the cancellation request.
       * @param {string} req.params.bookingId - The ID of the booking to be cancelled.
       * @param {Object} res - The response object to send the cancellation status and updated booking details.
       * 
       * @returns {Object} - The response containing the cancellation status and updated booking details in JSON format if the cancellation is successful, 
       * or an "Unauthorized" message with status code 401 if the user is not authorized to cancel the booking, 
       * or a "User not found" message with status code 404 if the user is not found, 
       * or a "Booking not found" message with status code 404 if the booking is not found.
       */
      const { userId, bookingId } = req.params;
      const user = usersStorage.get(userId).Some;
      const booking = bookingsStorage.get(bookingId).Some;
      if (!user) {
         res.status(404).json({ message: "User not found" });
      }
      if (!booking) {
         res.status(404).json({ message: "Booking not found" });
      }
      if (user?.id === booking?.menteeId) {
         booking.status = "cancelled";
         booking.updatedAt = getCurrentDate();
         bookingsStorage.insert(booking.id, booking);
         res.status(200).json({ message: "Booking cancelled successfully", booking: booking });
      } else {
         res.status(401).json({ message: "You are not authorized to cancel this booking" });
      }
   })

   app.patch("/users/:userId/bookings/:bookingId/accept", (req, res) => {
      /**
       * Handles the acceptance of a booking by a mentor.
       * 
       * @param {Object} req - The request object containing the user and booking IDs in the request parameters.
       * @param {string} req.params.userId - The ID of the user (mentor) accepting the booking.
       * @param {string} req.params.bookingId - The ID of the booking to be accepted.
       * @param {Object} res - The response object to send the acceptance status and updated booking details.
       * 
       * @returns {Object} - The response containing the acceptance status and updated booking details in JSON format if the acceptance is successful, 
       * or an "Unauthorized" message with status code 401 if the user is not authorized to accept the booking, 
       * or a "User not found" message with status code 404 if the user is not found, 
       * or a "Booking not found" message with status code 404 if the booking is not found.
       */
      const { userId, bookingId } = req.params;
      const user = usersStorage.get(userId).Some;
      const booking = bookingsStorage.get(bookingId).Some;
      if (!user) {
         res.status(404).json({ message: "User not found" });
      }
      if (!booking) {
         res.status(404).json({ message: "Booking not found" });
      }
      if (user?.id === booking?.mentorId) {
         booking.status = "accepted";
         booking.updatedAt = getCurrentDate();
         bookingsStorage.insert(booking.id, booking);
         res.status(200).json({ message: "Booking accepted successfully", booking: booking });
      } else {
         res.status(401).json({ message: "You are not authorized to accept this booking" });
      }
   })

   app.patch("/users/:userId/bookings/:bookingId/reject", (req, res) => {
      /**
       * Handles the rejection of a booking by a mentor.
       * 
       * @param {Object} req - The request object containing the user and booking IDs in the request parameters.
       * @param {string} req.params.userId - The ID of the user (mentor) rejecting the booking.
       * @param {string} req.params.bookingId - The ID of the booking to be rejected.
       * @param {Object} res - The response object to send the rejection status and updated booking details.
       * 
       * @returns {Object} - The response containing the rejection status and updated booking details in JSON format if the rejection is successful, 
       * or an "Unauthorized" message with status code 401 if the user is not authorized to reject the booking, 
       * or a "User not found" message with status code 404 if the user is not found, 
       * or a "Booking not found" message with status code 404 if the booking is not found.
       */
      const { userId, bookingId } = req.params;
      const user = usersStorage.get(userId).Some;
      const booking = bookingsStorage.get(bookingId).Some;
      if (!user) {
         res.status(404).json({ message: "User not found" });
      }
      if (!booking) {
         res.status(404).json({ message: "Booking not found" });
      }
      if (user?.id === booking?.mentorId) {
         booking.status = "rejected";
         booking.updatedAt = getCurrentDate();
         bookingsStorage.insert(booking.id, booking);
         res.status(200).json({ message: "Booking rejected successfully", booking: booking });
      } else {
         res.status(401).json({ message: "You are not authorized to reject this booking" });
      }
   })
   // User-Booking logic ends here

   return app.listen();
});

function getCurrentDate() {
   /**
    * Retrieves the current date and time from the Internet Computer's system time.
    * 
    * @returns {Date} - The current date and time as a JavaScript Date object.
    */
   const timestamp = new Number(ic.time());
   return new Date(timestamp.valueOf() / 1000_000);
}
