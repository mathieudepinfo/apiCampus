const DB_NAME 	= 'campusDb';
const Fs 		= require('fs'); //filesystem
const Path 		= require('path');
const Sqlite 	= require('sqlite3');

try {
    Fs.unlinkSync(`./${DB_NAME}`);
}
catch (_ign) {}

let DB;
/**Function that initialize the DB with some data**/
const reinitialize = function (name) {

    DB = new Sqlite.Database(name);

    const init = Fs.readFileSync(Path.join(process.cwd(), './database/bdd.sql'), 'utf-8');

    DB.exec(init);
};

reinitialize(DB_NAME);

module.exports = DB;
module.exports.reinitialize = reinitialize;