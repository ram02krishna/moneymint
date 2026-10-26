# MoneyMint Backend

This is the backend API for my MoneyMint app, built with Node.js and Express. It connects to a MongoDB database to store users, expenses, and incomes.

## What it does

- Handles user signup, login, and profile updates using JWT for security.
- Handles password resets with email links using Resend.
- Manages all the CRUD (Create, Read, Update, Delete) operations for expenses, incomes, and budgets.
- Sends data to the frontend so it can display charts and dashboards.
- Uploads profile pictures to Cloudinary.

## Tech Stack Used

- **Node.js & Express.js:** For the server and API routes.
- **MongoDB & Mongoose:** For the database and models.
- **JWT (jsonwebtoken):** To keep users logged in securely.
- **Bcryptjs:** To hash passwords so they aren't stored as plain text.
- **Multer & Cloudinary:** For handling image uploads.
- **Resend:** To send password reset emails.
- **Dotenv:** To manage environment variables.

## Getting Started

1. Go into the Backend folder and install packages:
   ```bash
   npm install
   ```

2. Create a `.env` file and add your config:
   ```env
   MONGO_URI=your_mongo_database_url
   JWT_SECRET=any_secret_string_you_want
   PORT=5000
   CLIENT_URL=http://localhost:5173
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   RESEND_API_KEY=your_resend_api_key
   FRONTEND_URL=http://localhost:5173
   ```

3. Run the server:
   ```bash
   npm run dev
   ```
   It uses nodemon, so it will automatically restart if you make any changes to the code.