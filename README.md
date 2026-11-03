# 📚 BookNook Server

### Backend API for the BookNook Library Management System

BookNook Server is the backend application of **BookNook**, a modern online library management system. It provides RESTful APIs for managing books, uploading book cover images, handling user authentication, and managing book borrowing and returning operations.

Built with **Node.js, Express.js, and MongoDB**, the backend securely handles book inventory and borrowing records while integrating with the Better Auth authentication system.

---

## 🌐 Project Links

| Resource | Link |
|---|---|
| Live Frontend | [BookNook](https://library-booknook.vercel.app/) |
| Live Backend API | [BookNook Server](https://booknook-server-seven.vercel.app/) |
| Frontend Repository | [booknook](https://github.com/Riaz-RZ/booknook) |
| Backend Repository | [booknook-server](https://github.com/Riaz-RZ/booknook-server) |

---

## ✨ Key Features

- **Book Management:** Add, view, retrieve, and delete books.
- **Secure Authentication:** Verify user access using JWT tokens and Better Auth JWKS.
- **Image Upload:** Upload book cover images using ImgBB.
- **Book Borrowing:** Allow authenticated users to borrow available books.
- **Inventory Management:** Automatically decrease available copies when a book is borrowed.
- **Duplicate Borrow Prevention:** Prevent users from borrowing the same book more than once while an active borrowing record exists.
- **Book Returning:** Return borrowed books and automatically restore available copies.
- **Borrowing History:** Retrieve borrowing records for the authenticated user.
- **14-Day Return Period:** Automatically calculate the expected return date.
- **Data Integrity:** Use MongoDB transactions to keep borrowing records and book inventory synchronized.

---

## 🛠️ Technology Stack

### Backend Technologies

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB
- **Authentication:** Better Auth JWT / JWKS verification
- **JWT Verification:** jose
- **Image Upload:** Multer
- **Image Hosting:** ImgBB
- **Environment Variables:** dotenv
- **Cross-Origin Requests:** CORS

---

## 📡 API Endpoints

Base URL:

```text
https://booknook-server-seven.vercel.app
```

### General

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| GET | `/` | Check server status | No |

### Book Management

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| GET | `/books` | Retrieve all books | No |
| GET | `/book/:id` | Retrieve a single book | Required |
| POST | `/books` | Add a new book | Required |
| DELETE | `/books/:id` | Delete an owned book | Required |

### Image Upload

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| POST | `/upload-image` | Upload a book cover image | Required |

**Image Upload Requirements:**
- Accepted formats: JPG, PNG, WEBP.
- Maximum file size: 5 MB.
- Images are hosted using ImgBB.

### Borrowing Management

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| POST | `/borrows` | Borrow a book | Required |
| GET | `/borrows/my-borrows` | Get the authenticated user's borrowed books | Required |
| DELETE | `/borrows/:borrowId` | Return a borrowed book | Required |

---

## 📖 Borrowing System Logic

BookNook uses MongoDB transactions to maintain accurate book inventory and borrowing records.

**Borrowing a Book**

1. Verify the user's authentication token.
2. Check whether the user has already borrowed the selected book.
3. Verify that at least one copy is available.
4. Decrease the available copy count by one.
5. Create a borrowing record.
6. Calculate the expected return date (14 days from borrowing).

**Returning a Book**

1. Verify the authenticated user.
2. Find the borrowing record belonging to that user.
3. Delete the active borrowing record.
4. Increase the available book copies by one.
5. Complete the return operation.

All related database operations are handled within MongoDB transactions to help prevent inconsistent inventory data.

---

## ⚙️ Installation & Setup

Follow these steps to run the backend locally.

### Prerequisites

Make sure you have installed:

- [Node.js](https://nodejs.org/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account or a local MongoDB server
- [ImgBB API Key](https://api.imgbb.com/)
- Better Auth configured in the frontend application

### 1. Clone the Repository

```bash
git clone https://github.com/Riaz-RZ/booknook-server.git
```

### 2. Navigate to the Project Directory

```bash
cd booknook-server
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:3000
IMGBB_API_KEY=your_imgbb_api_key
```

**Environment Variables**

| Variable | Description |
|---|---|
| `PORT` | Backend server port |
| `MONGODB_URI` | MongoDB connection string |
| `CLIENT_URL` | Frontend origin used to retrieve the Better Auth JWKS |
| `IMGBB_API_KEY` | API key for ImgBB image hosting |

Never commit your `.env` file or expose your API keys and database credentials.

### 5. Start the Server

```bash
node index.js
```

The server will run at:

```text
http://localhost:8000
```

If the MongoDB connection is successful, you should see:

```text
Successfully connected to MongoDB!
App is running on port 8000
```

---

## 📁 Project Structure

```text
booknook-server/
│
├── index.js          # Express server, API routes and database logic
├── package.json      # Project dependencies and configuration
├── package-lock.json # Dependency lock file
├── vercel.json       # Vercel deployment configuration
├── .gitignore        # Git ignored files
└── README.md         # Project documentation
```

---

## 🔐 Authentication

BookNook Server integrates with Better Auth through JWT verification.

- The frontend sends a Bearer token with protected API requests.
- The backend retrieves the public signing keys from the Better Auth JWKS endpoint.
- The `jose` library verifies the JWT.
- Authenticated user information is attached to the request.
- Protected operations use the verified user identity.

---

## 🚀 Deployment

The backend is deployed on **Vercel**.

Live API:

[https://booknook-server-seven.vercel.app/](https://booknook-server-seven.vercel.app/)

Make sure to configure the required environment variables in your deployment platform before deploying.

**Important:** MongoDB transactions require a MongoDB deployment that supports transactions, such as a replica set or sharded cluster.

---

## 🔗 Related Project

Check out the BookNook frontend repository:

[**BookNook Frontend – GitHub Repository**](https://github.com/Riaz-RZ/booknook)

---

## 👨‍💻 Developer

**Riazul Islam**

Full Stack Developer in Learning

- GitHub: [@Riaz-RZ](https://github.com/Riaz-RZ)
- LinkedIn: [Riazul Islam](https://www.linkedin.com/in/riazul-islam89)

---

⭐ If you find this project interesting, feel free to explore the repository and share your feedback!

**Built with ❤️ for Book Lovers.**