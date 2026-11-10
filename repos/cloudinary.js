const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

class CloudinaryRepo {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.cloud_name,
      api_key: process.env.api_key,
      api_secret: process.env.api_secret,
      timeout: 120000 // 2 minutes timeout
    });

    this._parser = this.createParser(process.env.folder_name);
    this.idsParser = this.createParser('ids', 1);
    this.damagesParser = this.createParser('damages', 5);
  }

  createParser(folder, files) {
    const storage = new CloudinaryStorage({
      cloudinary,
      params: {
        folder,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto:good' }],
        timeout: 120000
      }
    });
    return multer({ storage, limits: { fileSize: 10 * 1024 * 1024, ...(files ? {files} : {}) } }).any();
  }

  upload(files) {
    return cloudinary.uploader.upload(files);
  }

  uploadMany = (files) => {

    return new Promise((resolve, reject) => {
      const promises = [];

      files?.forEach((file) => {
        promises.push(
          new Promise((resolve, reject) => {
            cloudinary.uploader.upload(
              file.path,
              {
                timeout: 600000, // 10 minutes
                chunk_size: 6000000 // 6MB chunks
              },
              function (error, result) {
                if (error) {
                  console.log(error);
                  reject(error);
                } else {
                  resolve(result);
                }
              }
            );
          })
        );
      });

      Promise.all(promises)
        .then((results) => {
          resolve(results);
        })
        .catch((error) => {
          console.log(error);
          reject(error);
        });
    });
  };
  

  update(publicId, file) {
    return cloudinary.uploader.upload(file.path, { public_id: publicId });
  }

  delete(publicId) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, function(error, result) {
        if (error) {
          console.log('Cloudinary delete error:', error);
          reject(error);
        } else {
          console.log('Cloudinary delete result:', result);
          resolve(result);
        }
      });
    });
  }

  setParser(parser) {
    this._parser = parser;
  }

  getParser() {
    return this._parser;
  }
}


module.exports = new CloudinaryRepo();
