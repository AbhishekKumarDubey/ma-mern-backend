const fs = require('fs');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const Place = require('../models/place');
const User = require('../models/user');
const { getCoordsForAddress } = require('../util/location');

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  try {
    const place = await Place.findById(placeId);

    if (!place) {
      return next(
        new HttpError('Could not find a place for the provided id.', 400)
      );
    }

    res.status(200).json({ place: place.toObject({ getters: true }) });
  } catch (err) {
    console.log('err >>' + err);
    const error = new HttpError(
      'Something went wrong, please try again later',
      500
    );
    return next(error);
  }
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  try {
    const userWithPlaces = await User.findById(userId).populate('places');

    if (!userWithPlaces || userWithPlaces.places.length === 0)
      return next(
        new HttpError('Could not find a place for the provided user id.', 400)
      );

    res.status(200).json({
      places: userWithPlaces.places.map(place =>
        place.toObject({ getters: true })
      )
    });
  } catch (err) {
    console.log('err >>' + err);
    const error = new HttpError(
      'Fetching places failed, please try again',
      500
    );
    return next(error);
  }
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid inputs passed, check your data', 400));
  }

  const { title, description, address } = req.body;

  const createdPlace = new Place({
    title,
    description,
    location: getCoordsForAddress(),
    address,
    image: req.file.path,
    creator: req.userData.userId
  });

  try {
    const user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('Could not find user for provided id', 404));
    }

    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    sess.commitTransaction();

    res.status(201).json({ place: createdPlace });
  } catch (err) {
    console.log('err >>' + err.stack);
    const error = new HttpError('Creating place failed, please try again', 500);
    return next(error);
  }
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid inputs passed, check your data', 400));
  }

  const placeId = req.params.pid;

  const { title, description } = req.body;

  try {
    const place = await Place.findById(placeId);

    if (!place) {
      return next(
        new HttpError('Could not find a place for the provided id.', 400)
      );
    }

    if (place.creator.toString() !== req.userData.userId) {
      const error = new HttpError(
        'You are not allowed to edit this place',
        401
      );
      return next(error);
    }

    place.title = title;
    place.description = description;

    await place.save();

    res.status(200).json({ place: place.toObject({ getters: true }) });
  } catch (err) {
    console.log('err ', err);
    const error = new HttpError(
      'Something went wrong, could not update place',
      500
    );
    return next(error);
  }
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  try {
    const place = await Place.findById(placeId).populate('creator');

    if (!place) {
      return next(
        new HttpError(
          'Could not find place to delete, please try again later.',
          404
        )
      );
    }

    if (place.creator.id !== req.userData.userId) {
      const error = new HttpError(
        'You are not allowed to delete this place',
        401
      );
      return next(error);
    }

    const placeImagePath = place.image;

    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();

    fs.unlink(placeImagePath, err => console.log('Deleting place image', err));

    res.status(200).json({ message: 'Deleted place.' });
  } catch (err) {
    console.log('err ', err);
    const error = new HttpError(
      'Something went wrong, could not able to delete',
      500
    );
    return next(error);
  }
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
