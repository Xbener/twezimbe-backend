import multer, { StorageEngine } from 'multer';
import path from 'path'
import fs from 'fs';


const storage: StorageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads'; // Define your upload directory

        // Check if the directory exists
        fs.access(dir, (error) => {
            if (error) {
                // If the directory does not exist, create it
                fs.mkdir(dir, { recursive: true }, (err) => {
                    if (err) {
                        return cb(null, err.message as string); // Handle any error that occurs while creating the directory
                    }
                    cb(null, dir); // Call the callback with the directory path
                });
            } else {
                cb(null, dir); // If the directory exists, use it
            }
        });
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Create the Multer upload instance
const upload = multer({ storage });

export { upload };