"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

const geodist = require("geodist");

function compareGeoPoint(a, b, userGeoPoint) {
  const { lat, lng } = userGeoPoint;
  const aDistanceFromPerson = geodist({ lat, lng }, { lat: a.lat, lng: a.lng });
  const bDistanceFromPerson = geodist({ lat, lng }, { lat: b.lat, lng: b.lng });

  return aDistanceFromPerson > bDistanceFromPerson;
}

const compareHashtags = (a, b, hashtags) =>
  countEquals(hashtags, a.hashtags) - countEquals(hashtags, b.hashtags);

const countEquals = (hashtags, incommingHashtags) =>
  hashtags.filter((hashtag) => incommingHashtags.includes(hashtag)).length;

function getFarStringFromGeoPoint(usrLat, usrLng, objLat, objLng) {
  const distance = geodist(
    { lat: usrLat, lng: usrLng },
    { lat: objLat, lng: objLng }
  );

  switch (distance) {
    case distance < 5000:
      return "Very far";

    case distance < 2500:
      return "Far";

    case distance < 1500:
      return "Nearby";
  }
  return "Around the corner";
}

function filterDistance({
  userGeoPoint,
  objectGeoPoint,
  maxDistance,
  calculateFromM,
}) {
  const { lat: userLat, lng: userLng } = userGeoPoint;
  const { lat: objectLat, lng: objectLng } = objectGeoPoint;
  const distance = geodist(
    { lat: userLat, lng: userLng },
    { lat: objectLat, lng: objectLng }
  );

  return distance >= calculateFromM && distance <= maxDistance;
}

function filterTime({ last_seen, maxTime }) {
  return Date.now() - last_seen <= maxTime;
}

function getHashtags(users, userId) {
  return JSON.parse(
    users.filter(({ userId: objectId }) => userId === objectId)[0].hashtags
  );
}

const getUsers = (users) => {
  return strapi
    .query("cards")
    .find()
    .then((res) =>
      users.map(({ userId: neaybyUserId }) => {
        return res.find(({ userId }) => userId === neaybyUserId);
      })
    );
};

module.exports = {
  findWithPos(ctx) {
    const { lat, lng, userId } = ctx.params;
    const userGeoPoint = { lat, lng };
    return strapi
      .query("user-position")
      .find()
      .then(async (res) => {
        const allArrWithoutUser = res
          .filter(({ userId: objectId }) => userId !== objectId)
          .map((obj) => {
            return {
              ...obj,
              farFromUser: getFarStringFromGeoPoint(lat, lng, obj.lat, obj.lng),
            };
          });

        let usersInfo = await getUsers(allArrWithoutUser);

        usersInfo = usersInfo.map((obj) => {
          const foundUser = allArrWithoutUser.find(
            ({ userId }) => userId === obj.userId
          );
          delete obj.updated_by;
          delete obj.created_by;

          return {
            ...obj,
            last_seen: foundUser.last_seen,
            farFromuser: foundUser.farFromUser,
            lat: foundUser.lat,
            lng: foundUser.lng,
          };
        });
        const timeFilteredArr = usersInfo.filter(({ last_seen }) =>
          filterTime({ last_seen, maxTime: 600_000 })
        );

        return [
          timeFilteredArr
            .filter(({ lat, lng }) =>
              filterDistance({
                userGeoPoint,
                objectGeoPoint: { lat, lng },
                maxDistance: 50,
                calculateFromM: 0,
              })
            )
            .sort(
              (a, b) =>
                compareHashtags(a, b, getHashtags(res, userId)) ||
                compareGeoPoint(a, b, userGeoPoint)
            ),
          timeFilteredArr.filter(({ lat, lng }) =>
            filterDistance({
              userGeoPoint,
              objectGeoPoint: { lat, lng },
              maxDistance: 150,
              calculateFromM: 50,
            })
          ),
          usersInfo,
        ];
      });
  },

  findWithPosExtended(ctx) {
    const { lat, lng, userId } = ctx.params;
    const userGeoPoint = { lat, lng };

    return strapi
      .query("user-position")
      .find()
      .then((res) => {
        const allArrWithoutUser = res.filter(
          ({ userId: objectId }) => userId !== objectId
        );
        const timeFilteredArr = allArrWithoutUser.filter(({ last_seen }) =>
          filterTime({ last_seen, maxDistance: 600_000_000 })
        );

        return [
          timeFilteredArr
            .filter(({ lat, lng }) =>
              filterDistance({
                userGeoPoint,
                objectGeoPoint: { lat, lng },
                maxDistance: 5000,
                calculateFromM: 0,
              })
            )
            .sort((a, b) => compareGeoPoint(a, b, userGeoPoint)),
          timeFilteredArr.filter(({ lat, lng }) =>
            filterDistance({
              userGeoPoint,
              objectGeoPoint: { lat, lng },
              maxDistance: 50000,
              calculateFromM: 5000,
            })
          ),
          allArrWithoutUser,
        ];
      });
  },
};
