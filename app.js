const express = require('express');
const app = express();
require("dotenv").config()
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
app.use(express.json());

const mongourl = "mongodb+srv://mental_health:admin@cluster0.vywhy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongourl)
.then(() => {
    console.log("Connected");
  })
  .catch((error) => {
    console.log(error);
  });
  
  //Chat logic
require('./schemas/chat_schema.js')
const ChatModel = mongoose.model("mental health Chat")
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await ChatModel.find(
      {},
      { userId: 1, userName: 1, textMessage: 1, sentDate: 1, messageReceipt: 1 }
    )
    .sort({ sentDate: -1 })
    .lean();
    
    return res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const message = await ChatModel.create({
      userId: req.body.userId,
      userName: req.body.userName,
      textMessage: req.body.textMessage,
      sentDate: req.body.sentDate,
      messageReceipt: req.body.messageReceipt
    });
    
    return res.status(201).json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
//ends here!
// Login/Signup
require('./schemas/user_schema.js');
const User = mongoose.model("user_schema");

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const prevuser = await User.findOne({ username: username });
    if (prevuser) {
      return res.send({ status: "Error", data: "This Username exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      username: username,
      password: hashedPassword
    });
    res.send({ status: "ok", data: "Account Created" });
  } catch (error) {
    res.send({ status: "Error", data: error });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username: username });
    if (!user) {
      return res.send({ status: "Error", data: "Invalid Username or Password" });
    }
    const isPassValid = await bcrypt.compare(password, user.password);
    if (!isPassValid) {
      return res.send({ status: "Error", data: "Invalid username or password" });
    }
    return res.send({ status: "ok", data: "Login Successful!!" });
  } catch (error) {
    return res.send({ status: "Error", data: error.message });
  }
});

// Post related routes
require('./schemas/post_schema.js');
const Post = require('./schemas/post_schema.js');

// Add Post
require('./schemas/counter_schema.js');
const Counter = require('./schemas/counter_schema.js');
app.post('/addpost', async (req, res) => {
  const { username, post_type, post_title, post_content, post_date, post_time } = req.body;
  
  // Validate required fields
  if (!username || !post_type || !post_title || !post_content || !post_date || !post_time) {
    return res.status(400).json({
      status: 'error',
      data: 'All fields are required'
    });
  }

  try {
    
    const count = await Post.countDocuments();
    const post_id = `P${count + 1}`;
    
    // Check if this ID already exists (just in case)
    const existingPost = await Post.findOne({ post_id });
    if (existingPost) {
      // If ID exists, find the highest existing ID and add 1
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
    
    return res.status(200).json({
      status: 'ok',
      data: 'Posted Successfully',
      result
    });
  } catch (error) {
    console.error('Error saving post:', error);
    return res.status(500).json({
      status: 'error',
      data: error.message || 'Internal server error'
    });
  }
});

// Get all posts
app.get('/getpost', async (req, res) => {
  try {
    const post = await Post.find();
    res.send({ status: 'ok', data: post });
  } catch (error) {
    res.send({ status: 'Error', data: error.message });
  }
});

// Delete post
app.delete('/deletepost', async (req, res) => {
  const { post_id } = req.body;
  try {
    const deletePost = await Post.findOneAndDelete({ post_id: post_id });
    if (!deletePost) {
      return res.send({ status: 'Error', data: 'Post ID not found' });
    }
    res.send({ status: 'ok', data: 'Post deleted successfully' });
  } catch (error) {
    res.send({ status: 'Error', data: error.message });
  }
});

// Get posts by username
app.post('/getpost_username', async (req, res) => {
  console.log('Received request body:', req.body);
  const { username } = req.body;
  
  if (!username) {
    console.log('No username provided in request');
    return res.status(400).send({ 
      status: 'Error', 
      data: 'Username is required' 
    });
  }
  
  try {
    console.log('Searching for posts with username:', username);
    const posts = await Post.find({ username }).sort({ post_date: -1, post_time: -1 });
    console.log('Found posts:', posts.length);
    
    if (posts.length === 0) {
      console.log('No posts found for username:', username);
      return res.send({ 
        status: 'Error', 
        data: 'No posts found for this username' 
      });
    }

    console.log('Sending posts to client');
    res.send({ status: 'ok', data: posts });
  } catch (error) {
    console.error('Error in getpost_username:', error);
    res.status(500).send({ 
      status: 'Error', 
      data: error.message 
    });
  }
});
// Get last post ID (for debugging or validation)
app.get('/getlastpostid', async (req, res) => {
  try {
    const counter = await Counter.findOne({ name: 'postIdCounter' });
    res.json({ status: 'ok', data: { postIdCounter: counter.count } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.listen(process.env.PORT || 5002, () => {
  console.log("Server Started");
});

module.exports=app;
