import { v4 as uuidv4 } from 'uuid';
import { Server, StableBTreeMap, ic } from 'azle';
import express, { Request, Response } from 'express';

class User {
   id: string;
   username: string;
   password: string;
   role: "mentor" | "mentee";
   expertise: "ALGORAND" | "SUI" | "ETHEREUM" | "ICP" | "BITCOIN" | "SOLIDITY" | "SOLANA" | null;
   createdAt: Date;
   updatedAt: Date | null;
}

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
   app.post("/register", (req: Request, res: Response) => {
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

   app.post("/login", (req: Request, res: Response) => {
      const { username, password } = req.body;
      const user = usersStorage.values().find(v => v.username === username);
      if (user && user.password === password) {
         loginData.insert(user.id, user);
         res.status(200).json({ message: "User logged in successfully", user: user });
      } else {
         res.status(401).json({ message: "Invalid username or password" });
      }
   })

   app.post("/logout/:userId", (req: Request, res: Response) => {
      const { userId } = req.params;
      const deletedSession = loginData.remove(userId);
      if (deletedSession) {
         res.status(200).json({ message: "User logged out successfully" });
      } else {
         res.status(401).json({ message: "User not logged in" });
      }
   })

   app.get("/users/:userId", (req: Request, res: Response) => {
      const { userId } = req.params;
      const user = usersStorage.get(userId)?.Some;
      if (user) {
         res.status(200).json(user);
      } else {
         res.status(404).json({ message: "User not found" });
      }
   })

   app.post("/search", (req: Request, res: Response) => {
      const { expertise } = req.body;
      const mentors = usersStorage.values().filter(v => v.role === "mentor" && v.expertise === expertise.toUpperCase());
      if (mentors.length > 0) {
         res.status(200).json({ message: "Mentor(s) found", mentor: mentors });
      } else {
         res.status(404).json({ message: "Mentor(s) not found" });
      }
   })
   // User management logic ends here

   // Booking management logic begins here
   app.post("/book/:menteeId", (req: Request, res: Response) => {
      const { menteeId } = req.params;
      const user = loginData.get(menteeId)?.Some;
      if (!user || user.role !== "mentee") {
         res.status(401).json({ message: "Unauthorized to create booking" });
         return;
      }
      const { mentorId, date, startTime, endTime } = req.body;
      const booking = new Booking();
      booking.id = uuidv4();
      booking.mentorId = mentorId;
      booking.menteeId = menteeId;
      booking.date = new Date(date);
      booking.startTime = startTime;
      booking.endTime = endTime;
      booking.status = "accepted";
      booking.createdAt = getCurrentDate();
      booking.updatedAt = null;
      bookingsStorage.insert(booking.id, booking);
      res.status(200).json({ message: "Booking created successfully", booking: booking });
   })

   app.get("/bookings/:bookingId", (req: Request, res: Response) => {
      const { bookingId } = req.params;
      const booking = bookingsStorage.get(bookingId)?.Some;
      if (booking) {
         res.status(200).json(booking);
      } else {
         res.status(404).json({ message: "Booking not found" });
      }
   })

   app.get("/users/:userId/bookings", (req: Request, res: Response) => {
      const { userId } = req.params;
      const user = usersStorage.get(userId)?.Some;
      if (!user) {
         res.status(404).json({ message: "User not found" });
         return;
      }
      const bookings = Object.values(bookingsStorage.values()).filter(booking => booking.menteeId === user?.id || booking.mentorId === user?.id);
      res.status(200).json(bookings);
   })

   app.patch("/users/:userId/bookings/:bookingId/reschedule", (req: Request, res: Response) => {
      const { userId, bookingId } = req.params;
      const { date, startTime, endTime } = req.body;
      const user = usersStorage.get(userId)?.Some;
      const booking = bookingsStorage.get(bookingId)?.Some;
      if (!user || !booking) {
         res.status(404).json({ message: "User or booking not found" });
         return;
      }
      if (user.id !== booking.menteeId && user.id !== booking.mentorId) {
         res.status(401).json({ message: "Unauthorized to reschedule booking" });
         return;
      }
      booking.date = new Date(date);
      booking.startTime = startTime;
      booking.endTime = endTime;
      booking.updatedAt = getCurrentDate();
      booking.status = "rescheduled";
      bookingsStorage.insert(booking.id, booking);
      res.status(200).json({ message: "Booking rescheduled successfully", booking: booking });
   })

   app.patch("/users/:userId/bookings/:bookingId/cancel", (req: Request, res: Response) => {
      const { userId, bookingId } = req.params;
      const user = usersStorage.get(userId)?.Some;
      const booking = bookingsStorage.get(bookingId)?.Some;
      if (!user || !booking) {
         res.status(404).json({ message: "User or booking not found" });
         return;
      }
      if (user.id !== booking.menteeId) {
         res.status(401).json({ message: "Unauthorized to cancel booking" });
         return;
      }
      booking.status = "cancelled";
      booking.updatedAt = getCurrentDate();
      bookingsStorage.insert(booking.id, booking);
      res.status(200).json({ message: "Booking cancelled successfully", booking: booking });
   })

   app.patch("/users/:userId/bookings/:bookingId/accept", (req: Request, res: Response) => {
      const { userId, bookingId } = req.params;
      const user = usersStorage.get(userId)?.Some;
      const booking = bookingsStorage.get(bookingId)?.Some;
      if (!user || !booking) {
         res.status(404).json({ message: "User or booking not found" });
         return;
      }
      if (user.id !== booking.mentorId) {
         res.status(401).json({ message: "Unauthorized to accept booking" });
         return;
      }
      booking.status = "accepted";
      booking.updatedAt = getCurrentDate();
      bookingsStorage.insert(booking.id, booking);
      res.status(200).json({ message: "Booking accepted successfully", booking: booking });
   })

   app.patch("/users/:userId/bookings/:bookingId/reject", (req: Request, res: Response) => {
      const { userId, bookingId } = req.params;
      const user = usersStorage.get(userId)?.Some;
      const booking = bookingsStorage.get(bookingId)?.Some;
      if (!user || !booking) {
         res.status(404).json({ message: "User or booking not found" });
         return;
      }
      if (user.id !== booking.mentorId) {
         res.status(401).json({ message: "Unauthorized to reject booking" });
         return;
      }
      booking.status = "rejected";
      booking.updatedAt = getCurrentDate();
      bookingsStorage.insert(booking.id, booking);
      res.status(200).json({ message: "Booking rejected successfully", booking: booking });
   })

   return app.listen();
});

function getCurrentDate() {
   const timestamp = new Number(ic.time());
   return new Date(timestamp.valueOf() / 1000_000);
}
