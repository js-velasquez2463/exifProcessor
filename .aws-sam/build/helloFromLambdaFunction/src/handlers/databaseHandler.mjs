import mysql from 'mysql';

const connection = mysql.createConnection({
  host     : process.env.RDS_HOSTNAME,
  user     : process.env.RDS_USERNAME,
  password : process.env.RDS_PASSWORD,
  port     : process.env.RDS_PORT,
  database : process.env.RDS_DBNAME
});

export const createDatabaseHandler = async (event) => {
    connection.query("CREATE DATABASE test", function (err, result) {
    if (err) throw err;
    console.log("Database created");
  });
  return "Database Created"
};

const runQuery = (query) => {
    return new Promise((resolve, reject) => {
      connection.query(query, function (err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  };


export const queryDatabaseHandler = async (event) => {
    try {
      // Asumiendo que el evento es un string JSON con un campo "query"
      console.log("queryy", event.body)
      const requestBody = JSON.parse(event.body);
      console.log("queryy22", requestBody)

      const sqlQuery = requestBody.query;
  
      const result = await runQuery(sqlQuery);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Query executed successfully', result })
      };
    } catch (error) {
      console.error('Error executing query: ', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error executing query' })
      };
    }
  };
