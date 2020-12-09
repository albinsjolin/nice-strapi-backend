'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
  find(params, populate) {
    return strapi
      .query('user-position')
      .find(params, populate)
      .then(res => res.filter(({ last_seen }) => (Date.now() - last_seen) <= 600_000));
  },
};
