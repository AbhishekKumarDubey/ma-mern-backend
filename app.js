const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');

const HttpError = require('./models/http-error');

const app = express();

app.use(express.json());

app.use('/uploads/images', express.static(path.join('uploads', 'images')));
app.use(express.static(path.join('public')));

// Below CORS will not be required if frontend build is placed inside backend under public folder
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');

  next();
});

app.use('/api/places', require('./routes/places-routes'));
app.use('/api/users', require('./routes/users-routes'));

// app.use((req, res, next) => {
//   // for all unknown routes
//   res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
// });

// Above commented code will be required if frontend build is placed inside backend under public folder, below can be commented out
app.use((req, res, next) =>
  next(new HttpError('Could not find this route', 404))
);

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, err => console.log(err));
  }

  if (res.headerSent) {
    return next(error);
  }

  res.status(error.code || 500);
  res.json({ message: error.message || 'An unknown error occurred!' });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_USER_PASSWORD}@cluster0.4awlt.azure.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`,
    {
      useNewUrlParser: true,
      tlsAllowInvalidHostnames: true,
      tlsAllowInvalidCertificates: true
    }
  )
  .then(() =>
    app.listen(process.env.PORT || 5000, () =>
      console.log('Server started and listening at port 5000!')
    )
  )
  .catch(error =>
    console.log('Error occurred while connecting db', error.message)
  );
