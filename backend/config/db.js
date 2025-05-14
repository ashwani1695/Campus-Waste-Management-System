const mongoose = require('mongoose');

const connectDatabase = async () => {
    try {
        const connection = await mongoose.connect(process.env.MONGO_URL);
        console.log(MongoDB connected successfully: ${connection.connection.host});
    } catch(error) {
        console.log("Connection error: ", error);
        process.exit(1);
    }
}

module.exports =  connectDatabase;