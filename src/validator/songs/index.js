const InvariantError = require('../../exceptions/InvariantError');
const { SongsPayloadScheme } = require('./scheme');

const SongsValidator = {
  validateSongsPayload: (payload) => {
    const validationResult = SongsPayloadScheme.validate(payload);

    if (validationResult.error) {
      throw new InvariantError(validationResult.error.message);
    }
  },
};

module.exports = SongsValidator;