const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();

app.use(express.json());

let database = null;

const dbPath = path.join(__dirname, "covid19India.db");

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Sever Running at http://localhost:3000/")
    );
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getAllStatesQuery = `SELECT
   * 
   FROM
    state;`;
  const statesArray = await database.all(getAllStatesQuery);
  response.send(
    statesArray.map((state) => convertStateDbObjectToResponseObject(state))
  );
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getSpecificStateQuery = `SELECT * FROM 
    state 
    WHERE 
    state_id = ${stateId};`;
  const stateDetails = await database.get(getSpecificStateQuery);
  response.send(convertStateDbObjectToResponseObject(stateDetails));
});

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const addNewDistrictQuery = `INSERT INTO 
  district (state_id,district_name,
    cases,cured,active,deaths)
    VALUES 
    (${stateId},'${districtName}',${cases},${cured},${active},${deaths});`;
  await database.run(addNewDistrictQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `SELECT * 
    FROM district WHERE district_id = ${districtId};`;
  const district = await database.get(getDistrictQuery);
  response.send(convertDistrictDbObjectToResponseObject(district));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `DELETE FROM district
    WHERE district_id = ${districtId};`;
  await database.run(deleteDistrictQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrictQuery = `UPDATE 
    district 
    SET 
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
    WHERE district_id = ${districtId};`;
  await database.run(updateDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const statsQuery = `SELECT 
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
    FROM 
    district
    WHERE state_id = ${stateId};`;
  const statsDetail = await database.get(statsQuery);
  response.send({
    totalCases: statsDetail["SUM(cases)"],
    totalCured: statsDetail["SUM(cured)"],
    totalActive: statsDetail["SUM(active)"],
    totalDeaths: statsDetail["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateNameQuery = `SELECT state_name
    FROM 
    district 
    NATURAL JOIN 
    state 
    WHERE
     district_id = ${districtId};`;
  const stateName = await database.get(stateNameQuery);
  response.send({
    stateName: stateName.state_name,
  });
});

module.exports = app;
