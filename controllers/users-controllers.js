const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const HttpError = require('../models/http-error');
const User = require('../models/user');

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}, '-password');

    res
      .status(200)
      .json({ users: users.map(user => user.toObject({ getters: true })) });
  } catch (err) {
    console.log('err ', err);
    const error = new HttpError(
      'Something went wrong, please try again later',
      500
    );
    return next(error);
  }
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 400)
    );
  }

  const { name, email, password } = req.body;

  try {
    const hasUser = await User.findOne({ email });

    if (hasUser) {
      return next(
        new HttpError('User exists already, please login instead.', 400)
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const createdUser = new User({
      name,
      email,
      password: hashedPassword,
      image: req.file.path,
      places: []
    });

    await createdUser.save();

    const token = jwt.sign(
      { userId: createdUser.id, email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res
      .status(201)
      .json({ userId: createdUser.id, email: createdUser.email, token });
  } catch (err) {
    console.log('err >>' + err);
    const error = new HttpError(
      'Signing up failed, please try again later.',
      500
    );
    return next(error);
  }
};

const login = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 400)
    );
  }

  const { email, password } = req.body;

  try {
    const identifiedUser = await User.findOne({ email });

    if (!identifiedUser) {
      return next(
        new HttpError(
          'Could not identify user, credentials seem to be wrong.',
          403
        )
      );
    }

    const isValidPassword = await bcrypt.compare(
      password,
      identifiedUser.password
    );

    if (!isValidPassword) {
      return next(
        new HttpError(
          'Could not identify user, credentials seem to be wrong.',
          403
        )
      );
    }

    const token = jwt.sign(
      { userId: identifiedUser.id, email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res
      .status(200)
      .json({ userId: identifiedUser.id, email: identifiedUser.email, token });
  } catch (err) {
    console.log('err ', err);
    const error = new HttpError(
      'Logging in failed, please try again later.',
      500
    );
    return next(error);
  }
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
