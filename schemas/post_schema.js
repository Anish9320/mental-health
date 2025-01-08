const mongoose = require('mongoose');

const post_schema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    post_id: { type: String, required: true,unique:true},
    post_type: { type: String, required: true },
    post_title: { type: String, required: true },
    post_content: { type: String, required: true },
    post_date: { type: String, required: true }, 
    post_time: { type: String, required: true }, 
  },
  {
    collection: 'post_schema', 
  }
);

const Post = mongoose.model('post_schema', post_schema);
module.exports = Post;
