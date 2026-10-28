
const { default: ImageKit } = require("@imagekit/nodejs");

const imagekit = new ImageKit({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    publickey: process.env.IMAGEKIT_PUBLIC_KEY,
    urlendpoint: process.env.IMAGEKIT_PRIVATE_KEY,
});

async function uploadFile(file) {
    const result = await imagekit.files.upload({
        file: file.buffer.toString("base64"),
        fileName: file.originalname || "First-file",
    });

    return result;
}

module.exports = uploadFile;
