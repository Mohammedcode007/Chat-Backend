// db.js

const mongoose = require('mongoose');
const colors = require("colors");

mongoose.connect('mongodb+srv://admin:1uSNviRlsYAqlDaE@cluster0.mjl8tca.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'.cyan.underline))
  .catch((error) => console.error('MongoDB connection error:', error));

module.exports = mongoose.connection;
