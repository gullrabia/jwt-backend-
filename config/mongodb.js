import mongoose from "mongoose";

let isConnected = false;

const connectDB = async () => {
  try {
    // Check environment variable
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in environment variables");
    }

    // Reuse existing connection
    if (isConnected || mongoose.connection.readyState === 1) {
      console.log("MongoDB already connected");
      return mongoose.connection;
    }

    // Connect to MongoDB
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
    });

    isConnected = true;

    console.log(
      `MongoDB Connected: ${connection.connection.host}`
    );

    return connection;
  } catch (error) {
    console.error("MongoDB Connection Error:", error);

    // DO NOT use process.exit() on Vercel
    throw error;
  }
};

export default connectDB;