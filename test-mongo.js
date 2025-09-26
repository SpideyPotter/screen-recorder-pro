import mongoose from "mongoose";

const uri = "mongodb+srv://ravindrareddykota23cse_db_user:CwbnAaubJ16BQOyd@cluster0.dbpnwex.mongodb.net/screen-recorder?retryWrites=true&w=majority";

mongoose.connect(uri)
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas!");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Connection failed:", err.message);
    process.exit(1);
  });