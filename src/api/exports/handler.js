const autoBind = require('auto-bind');

class ExportsHandler {
  constructor(service, playlistsService, validator) {
    this._service = service;
    this._playlistsService = playlistsService;
    this._validator = validator;

    autoBind(this);
  }

  async postExportPlaylistsHandler(request, h) {
    this._validator.validateExportPlaylistPayload(request.payload);
    const { playlistId } = request.params;
    const { id: owner } = request.auth.credentials;
    const { targetEmail } = request.payload;

    await this._playlistsService.verifyPlaylistOwner(playlistId, owner);
    const playlist = await this._playlistsService.getSongsFromPlaylist(playlistId);

    const message = {
      userId: owner,
      playlistId,
      targetEmail,
      playlist,
    };

    await this._service.sendMessage('export:playlists', JSON.stringify(message));

    const response = h.response({
      status: 'success',
      message: 'Permintaan Anda dalam antrean',
    });
    response.code(201);
    return response;
  }
}

module.exports = ExportsHandler;