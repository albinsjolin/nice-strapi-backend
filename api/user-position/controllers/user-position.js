'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

const geodist = require('geodist');

function compareGeoPoint(a, b, userGeoPoint) {
  const { lat, lng } = userGeoPoint;
  const aDistanceFromPerson = geodist({ lat, lng, }, { lat: a.lat, lng: a.lng });
  const bDistanceFromPerson = geodist({ lat, lng, }, { lat: b.lat, lng: b.lng });

  return aDistanceFromPerson > bDistanceFromPerson;
}

function filterDistanceAndTime({
  last_seen,
  userGeoPoint,
  objectGeoPoint,
  maxDistance,
  maxTime,
}) {
  const { lat: userLat, lng: userLng } = userGeoPoint;
  const { lat: objectLat, lng: objectLng } = objectGeoPoint;
  const distance = geodist({ lat: userLat, lng: userLng }, { lat: objectLat, lng: objectLng });

  return (Date.now() - last_seen) <= maxTime && distance <= maxDistance;
}

module.exports = {
  findWithPos(ctx) {
    const { lat, lng, userId } = ctx.params;
    const userGeoPoint = { lat, lng };

    return strapi
      .query('user-position')
      .find()
      .then(res => res
        .filter(({ userId: objectId }) => userId !== objectId)
        .filter(({ last_seen, lat: objectLat, lng: objectLng }) =>
          filterDistanceAndTime({
            last_seen,
            objectGeoPoint: {
              lat: objectLat,
              lng: objectLng
            },
            userGeoPoint,
            maxDistance: 50,
            maxTime: 600_000,
          }))
        .sort((a, b) => compareGeoPoint(a, b, userGeoPoint))
      );
  },

  findWithPosExtended(ctx) {
    const { lat, lng, userId } = ctx.params;
    const userGeoPoint = { lat, lng };

    return strapi
      .query('user-position')
      .find()
      .then(
        res => res
          .filter(({ userId: objectId }) => userId !== objectId)
          .filter(({ last_seen, lat: objectLat, lng: objectLng }) =>
            filterDistanceAndTime({
              last_seen,
              objectGeoPoint: {
                lat: objectLat,
                lng: objectLng
              },
              userGeoPoint,
              maxTime: 600_000_000,
            }))
          .sort((a, b) => compareGeoPoint(a, b, userGeoPoint))
      );
  },
};
