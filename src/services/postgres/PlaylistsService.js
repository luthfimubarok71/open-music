const autoBind = require('auto-bind');
const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationErrror');

class PlaylistsService {
  constructor(collaborationsService) {
    this._pool = new Pool();
    this._collaborationsService = collaborationsService;

    autoBind(this);
  }

  async addPlaylist({ name, owner }) {
    const id = `playlist-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3) RETURNING id',
      values: [id, name, owner],
    };

    const result = await this._pool.query(query);

    if (result.rowCount === 0) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getPlaylists(owner) {
    const query = {
      text: `SELECT playlists.id, playlists.name, users.username
      FROM playlists
      LEFT JOIN users ON users.id = playlists.owner
      LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
      WHERE playlists.owner = $1 OR collaborations.user_id = $1`,
      values: [owner],
    };
    const result = await this._pool.query(query);
    return result.rows;
  }

  async deletePlaylistById(id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id',
      values: [id],
    };
    const result = await this._pool.query(query);

    if (result.rowCount === 0) {
      throw new NotFoundError('Playlist gagal dihapus. Id tidak ditemukan');
    }
  }

  async verifyPlaylistOwner(id, owner) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id],
    };
    const result = await this._pool.query(query);

    if (result.rowCount === 0) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    const playlist = result.rows[0];

    if (playlist.owner !== owner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async getPlaylistOwnerById(playlistId) {
    const query = {
      text: 'SELECT owner FROM playlists WHERE id = $1',
      values: [playlistId],
    };
    const result = await this._pool.query(query);
    if (result.rowCount === 0) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }
    return result.rows[0].owner;
  }

  async addSongToPlaylist(playlistId, songId) {
    const id = `playlist-song-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlist_songs VALUES ($1,$2,$3) RETURNING id',
      values: [id, playlistId, songId],
    };

    const result = await this._pool.query(query);
    if (result.rowCount === 0) {
      throw new InvariantError('Lagu gagal ditambahkan ke dadalam playlist');
    }

    return result.rows[0].id;
  }

  async addActivitiesToDB(playlistId, songId, userId, action) {
    const id = `activities-${nanoid(16)}`;
    const time = new Date().toISOString();
    const query = {
      text: 'INSERT INTO playlist_song_activities VALUES ($1, $2, $3, $4, $5, $6)',
      values: [id, playlistId, songId, userId, action, time],
    };

    const result = await this._pool.query(query);
    if (result.rowCount === 0) {
      throw new InvariantError('Gagal menambahkan aktivitas ke database');
    }
  }

  async getSongsFromPlaylist(playlistId) {
    const queryPlaylists = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [playlistId],
    };
    const queryUsers = {
      text: `SELECT users.username FROM users
      LEFT JOIN playlists ON users.id = playlists.owner
      WHERE playlists.id = $1`,
      values: [playlistId],
    };
    const querySongs = {
      text: `SELECT songs.id, songs.title, songs.performer FROM songs
      LEFT JOIN playlist_songs ON songs.id = playlist_songs.song_id
      WHERE playlist_songs.playlist_id = $1`,
      values: [playlistId],
    };

    const resultPlaylists = await this._pool.query(queryPlaylists);
    const resultUsers = await this._pool.query(queryUsers);
    const resultSongs = await this._pool.query(querySongs);
    if (resultPlaylists.rowCount === 0) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    return {
      id: resultPlaylists.rows[0].id,
      name: resultPlaylists.rows[0].name,
      username: resultUsers.rows[0].username,
      songs: resultSongs.rows,
    };
  }

  async getPlaylistActivities(playlistId) {
    const query = {
      text: `SELECT psa.playlist_id AS playlistId, users.username, songs.title, psa.action, psa.time 
      FROM playlist_song_activities psa
      LEFT JOIN users ON psa.user_id = users.id
      LEFT JOIN songs ON psa.song_id = songs.id
      WHERE psa.playlist_id = $1
      ORDER BY psa.time ASC`,
      values: [playlistId],
    };
    const result = await this._pool.query(query);

    if (result.rowCount === 0) {
      throw new NotFoundError('Playlist tidak ada atau tidak ada Aktifitas');
    }

    return {
      playlistId,
      activities: result.rows.map((row) => ({
        username: row.username,
        title: row.title,
        action: row.action,
        time: row.time,
      })),
    };
  }

  async deleteSongFromPlaylist(playlistId, songId) {
    const query = {
      text: 'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2 RETURNING id',
      values: [playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (result.rowCount === 0) {
      throw new InvariantError('Lagu gagal dihapus');
    }
  }

  async verifySongPlaylist(songId) {
    const query = {
      text: 'SELECT * FROM songs WHERE id = $1',
      values: [songId],
    };
    const result = await this._pool.query(query);
    if (result.rowCount === 0) {
      throw new NotFoundError('Lagu tidak ditemukan di playlist');
    }
    return result.rows[0];
  }

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      try {
        await this._collaborationsService.verifyCollaborator(playlistId, userId);
      } catch (collaborationError) {
        throw error;
      }
    }
  }
}

module.exports = PlaylistsService;