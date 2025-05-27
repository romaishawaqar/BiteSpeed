// index.js
import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import identifyRoute from './routes/identifyRoute.js';

dotenv.config();

const app = express();
await connectDB();

app.use(express.json());
app.use('/identify', identifyRoute);

app.get('/', (req, res) => {
  res.send('BiteSpeed Identity Resolution API');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
