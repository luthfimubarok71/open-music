const InvariantError = require('../../exceptions/InvariantError');
const { AlbumsPayloadScheme } = require('./scheme');

const AlbumsValidator = {
  validateAlbumsPayload: (payload) => {
    const validationResult = AlbumsPayloadScheme.validate(payload);

    if (validationResult.error) {
      throw new InvariantError(validationResult.error.message);
    }
  },
};

module.exports = AlbumsValidator;