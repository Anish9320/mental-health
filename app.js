const express = require('express');
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
app.use(express.json());

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    status: 'error', 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// Request validation middleware
const validateRequest = (req, res, next) => {
  if (!req.body) {
    return res.status(400).json({ status: 'error', message: 'Invalid request body' });
  }
  next();
};

// MongoDB connection with retry logic
const connectWithRetry = async () => {
  const mongourl = process.env.MONGODB_URI || "mongodb+srv://mental_health:admin@cluster0.vywhy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
  try {
    await mongoose.connect(mongourl);
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    console.log("Retrying connection in 5 seconds...");
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Chat logic
require('./schemas/chat_schema.js');
const ChatModel = mongoose.model("mental health Chat");

app.get('/api/messages', async (req, res, next) => {
  try {
    const messages = await ChatModel.find(
      {},
      { userId: 1, userName: 1, textMessage: 1, sentDate: 1, messageReceipt: 1 }
    )
    .sort({ sentDate: -1 })
    .lean();
    
    if (!messages) {
      return res.status(404).json({ status: 'error', message: 'No messages found' });
    }
    
    return res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
});

app.post('/api/messages', validateRequest, async (req, res, next) => {
  try {
    const { userId, userName, textMessage, sentDate, messageReceipt } = req.body;
    
    if (!userId || !userName || !textMessage) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Missing required fields' 
      });
    }
    
    const message = await ChatModel.create({
      userId,
      userName,
      textMessage,
      sentDate: sentDate || new Date(),
      messageReceipt
    });
    
    return res.status(201).json(message);
  } catch (error) {
    next(error);
  }
});

// Login/Signup
require('./schemas/user_schema.js');
const User = mongoose.model("user_schema");

app.post('/signup', validateRequest, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Username and password are required' 
      });
    }
    
    const prevuser = await User.findOne({ username: username });
    if (prevuser) {
      return res.status(409).json({ 
        status: 'error', 
        message: 'Username already exists' 
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      username: username,
      password: hashedPassword
    });
    
    res.status(201).json({ status: 'ok', message: 'Account Created' });
  } catch (error) {
    next(error);
  }
});

app.post('/login', validateRequest, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Username and password are required' 
      });
    }
    
    const user = await User.findOne({ username: username });
    if (!user) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid username or password' 
      });
    }
    
    const isPassValid = await bcrypt.compare(password, user.password);
    if (!isPassValid) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid username or password' 
      });
    }
    
    return res.status(200).json({ status: 'ok', message: 'Login Successful!!' });
  } catch (error) {
    next(error);
  }
});

// Post related routes
require('./schemas/post_schema.js');
const Post = require('./schemas/post_schema.js');
require('./schemas/counter_schema.js');
const Counter = require('./schemas/counter_schema.js');

app.post('/addpost', validateRequest, async (req, res, next) => {
  try {
    const { username, post_type, post_title, post_content, post_date, post_time } = req.body;
    
    if (!username || !post_type || !post_title || !post_content || !post_date || !post_time) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required'
      });
    }

    const count = await Post.countDocuments();
    let post_id = `P${count + 1}`;
    
    const existingPost = await Post.findOne({ post_id });
    if (existingPost) {
      const highestPost = await Post.findOne().sort({ post_id: -1 });
      const highestNum = highestPost ? parseInt(highestPost.post_id.substring(1)) : 0;
      post_id = `P${highestNum + 1}`;
    }
    
    const newPost = new Post({
      username,
      post_id,
      post_type,
      post_title,
      post_content,
      post_date,
      post_time
    });

    const result = await newPost.save();
    
    return res.status(201).json({
      status: 'ok',
      message: 'Posted Successfully',
      result
    });
  } catch (error) {
    next(error);
  }
});

app.get('/getpost', async (req, res, next) => {
  try {
    const posts = await Post.find();
    
    if (!posts || posts.length === 0) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'No posts found' 
      });
    }
    
    res.status(200).json({ status: 'ok', data: posts });
  } catch (error) {
    next(error);
  }
});

app.delete('/deletepost', validateRequest, async (req, res, next) => {
  try {
    const { post_id } = req.body;
    
    if (!post_id) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Post ID is required' 
      });
    }
    
    const deletePost = await Post.findOneAndDelete({ post_id: post_id });
    if (!deletePost) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Post not found' 
      });
    }
    
    res.status(200).json({ status: 'ok', message: 'Post deleted successfully' });
  } catch (error) {
    next(error);
  }
});

app.post('/getpost_username', validateRequest, async (req, res, next) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Username is required' 
      });
    }
    
    const posts = await Post.find({ username }).sort({ post_date: -1, post_time: -1 });
    
    if (!posts || posts.length === 0) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'No posts found for this username' 
      });
    }

    res.status(200).json({ status: 'ok', data: posts });
  } catch (error) {
    next(error);
  }
});

app.get('/getlastpostid', async (req, res, next) => {
  try {
    const counter = await Counter.findOne({ name: 'postIdCounter' });
    
    if (!counter) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Counter not found' 
      });
    }
    
    res.status(200).json({ status: 'ok', data: { postIdCounter: counter.count } });
  } catch (error) {
    next(error);
  }
});

// Apply error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Server Started on port ${PORT}`);
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

module.exports = app;
