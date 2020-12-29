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

function getFarStringFromGeoPoint(usrLat, usrLng, objLat, objLng) {
  const distance = geodist({ lat: usrLat, lng: usrLng }, { lat: objLat, lng: objLng });

  switch (distance) {
    case distance < 5000:
      return 'Very far';

    case distance < 2500:
      return 'Far';

    case distance < 1500:
      return 'Nearby';
  }
  return 'Around the corner';
}

function filterDistance({
  userGeoPoint,
  objectGeoPoint,
  maxDistance,
  calculateFromM
}) {
  const { lat: userLat, lng: userLng } = userGeoPoint;
  const { lat: objectLat, lng: objectLng } = objectGeoPoint;
  const distance = geodist({ lat: userLat, lng: userLng }, { lat: objectLat, lng: objectLng });

  return (distance >= calculateFromM) && (distance <= maxDistance);
}

function filterTime({ last_seen, maxTime }) {
  return ((Date.now() - last_seen) <= maxTime);
}

module.exports = {
  findWithPos(ctx) {
    const { lat, lng, userId } = ctx.params;
    const userGeoPoint = { lat, lng };

    return strapi
      .query('user-position')
      .find()
      .then(res => {
        const allArrWithoutUser = res
          .filter(({ userId: objectId }) => userId !== objectId)
          .map((obj) => {

            return { ...obj, farFromUser: getFarStringFromGeoPoint(lat, lng, obj.lat, obj.lng) };
          });
        const timeFilteredArr = allArrWithoutUser.filter(({ last_seen }) => filterTime({ last_seen, maxTime: 600_000 }));

        return [
          timeFilteredArr
            .filter(({ lat, lng }) => filterDistance({ userGeoPoint, objectGeoPoint: { lat, lng }, maxDistance: 50, calculateFromM: 0 }))
            .sort((a, b) => compareGeoPoint(a, b, userGeoPoint)),
          timeFilteredArr
            .filter(({ lat, lng }) => filterDistance({ userGeoPoint, objectGeoPoint: { lat, lng }, maxDistance: 150, calculateFromM: 50 })),
          allArrWithoutUser,
        ];
      });
  },

  findWithPosExtended(ctx) {
    const { lat, lng, userId } = ctx.params;
    const userGeoPoint = { lat, lng };

    return strapi
      .query('user-position')
      .find()
      .then(res => {
        const allArrWithoutUser = res.filter(({ userId: objectId }) => userId !== objectId);
        const timeFilteredArr = allArrWithoutUser.filter(({ last_seen }) => filterTime({ last_seen, maxDistance: 600_000_000 }));

        return [
          timeFilteredArr
            .filter(({ lat, lng }) => filterDistance({ userGeoPoint, objectGeoPoint: { lat, lng }, maxDistance: 5000, calculateFromM: 0 }))
            .sort((a, b) => compareGeoPoint(a, b, userGeoPoint)),
          timeFilteredArr
            .filter(({ lat, lng }) => filterDistance({ userGeoPoint, objectGeoPoint: { lat, lng }, maxDistance: 50000, calculateFromM: 5000 })),
          allArrWithoutUser,
        ];
      });
  },
};
