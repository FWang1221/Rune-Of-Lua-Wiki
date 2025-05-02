// Initialize global variables

const creatureColumns = {
  "ID": "column1",
  "Class": "column4",
  "Name": "column9",
  "Nickname": "column10",
  "Race" : "column13",
  "Passive" : "column12",
  "Health" : "column6",
  "Attack" : "column2",
  "Intelligence" : "column7",
  "Defense" : "column5",
  "Speed" : "column14",
  "OverworldSprite" : "column11",
  "BattleSprite" : "column3",
  "Mana" : "column8",
  "Tier" : "column15",
  "Tags" : "column16",
}

const passiveColumns = {
  "ID" : "column1",
  "Name" : "column2",
  "Description" : "column3",
}

const spellColumns = {
  "ID" : "column1",
  "Name" : "column5",
  "Class" : "column2",
  "Description" : "column3",
  "Charges" : "column4",
  "Flags" : "column6",
}

const matColumns = {
  "ID" : "column1",
  "Name" : "column2",
  "Passive" : "column5",
}

const rdbColumns = {
  "ID" : "column1",
  "Name" : "column2",
  "Description" : "column3",
}

const joins = [
  {
    table1: "creature",
    table2: "passive",
    col1: "column12", // Passive ID in creature
    col2: "column1",   // ID in passive
    returns: ["column2", "column3"], // Name and Description from passive table
  },
  {
    table1: "mat",
    table2: "passive",
    col1: "column5", // Passive ID in mat
    col2: "column1",   // ID in passive
    returns: ["column2", "column3"], // Name and Description from passive table
  }
]

var db; // Global variable for the database

document.getElementById("importBtn").addEventListener("click", async function () {
  const csvFiles = document.getElementById('csvFiles').files;
  if (csvFiles.length === 0) {
    alert("Please upload CSV files first!");
    return;
  }

  // Load sql.js using the CDN
  const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.1/${file}` });


  // Create an in-memory database
  db = new SQL.Database();
  for (const file of csvFiles) {
    const reader = new FileReader();
    reader.onload = async function (event) {
      const csvData = event.target.result;

      // Replace custom delimiter with standard delimiter
      const delimiter = '{}{}{}';
      const rows = csvData.split('\n').map(row => row.trim()).filter(row => row.length > 0);
      
      // Split rows into columns based on the custom delimiter
      const csvLines = rows.map(row => row.split(delimiter).map(value => value.trim()));

      // Determine table name from file name (without .csv extension)
      const tableName = file.name.replace('.csv', '').replace(/[^a-zA-Z0-9_]/g, '_'); // Sanitize table name
      const numColumns = Math.max(...csvLines.map(row => row.length), 1); // Ensure at least one column
      
      // Automatically determine column types based on the data
      const columnNames = [];
      for (let i = 0; i < numColumns; i++) {
        const columnData = csvLines.map(row => row[i]);
        const isNumericColumn = columnData.every(value => !isNaN(parseFloat(value)) && isFinite(value));

        // If all values in the column can be converted to numbers, use REAL or INTEGER
        if (isNumericColumn) {
          columnNames.push(`column${i + 1} REAL`); // Use REAL for numbers (supports both integers and floats)
        } else {
          columnNames.push(`column${i + 1} TEXT`); // Keep it as TEXT if any value is not a number
        }
      }

      const dropTableQuery = `DROP TABLE IF EXISTS ${tableName};`;
      try {
        db.run(dropTableQuery);
      } catch (err) {
        console.error("SQL Error: ", err.message);
        alert(`Error dropping table ${tableName}: ` + err.message);
      }

      const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnNames.join(", ")});`;

      // Log the create table query for debugging
      console.log("Create Table Query: ", createTableQuery);

      try {
        db.run(createTableQuery);

        const insertQuery = `INSERT INTO ${tableName} (${columnNames.map((_, idx) => `column${idx + 1}`).join(", ")}) VALUES (${columnNames.map(() => '?').join(", ")});`;
        const stmt = db.prepare(insertQuery);
        
        for (let i = 0; i < csvLines.length; i++) {
          let row = csvLines[i];

          // Convert each value to a number if possible
          row = row.map(value => {
            const numValue = parseFloat(value); // Use parseFloat instead of parseInt to handle floats as well
            return !isNaN(numValue) ? numValue : value; // Return the number if valid, else keep the value as string
          });

          // Fill missing values with "N/A"
          if (row.length < numColumns) {
            row = row.concat(Array(numColumns - row.length).fill('N/A'));
          }

          if (row.length === numColumns) {
            try {
              stmt.run(row);
              // Log every 100th row for debugging
              if (i % 100 === 0) {
                console.log(`Inserted row ${i}:`, row);
              }
            } catch (err) {
              console.error(`Error inserting row ${i}:`, row, err.message);
            }
          } else {
            console.warn(`Skipping row ${i} due to column mismatch:`, row);
          }
        }
        
        console.log(`Total Rows Inserted into ${tableName}:`, csvLines.length);
        console.log(`${file.name} imported successfully.`);
      } catch (err) {
        console.error("SQL Error: ", err.message);
        alert(`Error creating table for ${file.name}: ` + err.message);
      }


      let columnsTable = creatureColumns; // Default to creature table columns
      if (tableName === "passive") {
        columnsTable = passiveColumns;
      } else if (tableName === "spell") {
        columnsTable = spellColumns;
      } else if (tableName === "mat") {
        columnsTable = matColumns;
      } else if (tableName === "rdb") {
        columnsTable = rdbColumns;
      }

      const nameColumn = columnsTable["Name"]; // Get the name column from the selected table

      const indexOnNameQuery = `CREATE INDEX IF NOT EXISTS idx_${tableName}_name ON ${tableName} (${nameColumn});`;

      try {

        db.run(indexOnNameQuery);

      } catch (err) {

        console.error("SQL Error: ", err.message);

      }

      const idColumn = "column1";

      const indexOnIDQuery = `CREATE INDEX IF NOT EXISTS idx_${tableName}_id ON ${tableName} (${idColumn});`;

      try {

        db.run(indexOnIDQuery);

      } catch (err) {

        console.error("SQL Error: ", err.message);

      }


    };

    

    reader.onerror = function (error) {
      console.error(`Error reading file ${file.name}:`, error.message);
      alert(`Error reading file ${file.name}: ` + error.message);
    };

    reader.readAsText(file);
  }
});



// helper: create a clause element with support for NOT, BETWEEN, and LIKE
function createClause() {
  const table = document.getElementById("tableSelect").value;  // Get the selected table

  const clause = document.createElement("div");
  clause.className = "clause";
  clause.innerHTML = `
    <label>
      column: 
      <select class="columnInput">
        <option value="">Select column</option>
      </select>
    </label>
    <label>
      operator: 
      <select class="operatorSelect">
        <option value="=">=</option>
        <option value="!=">${"<>"}</option>
        <option value="<">${"<"}</option>
        <option value=">">${">"}</option>
        <option value="<=">${"<="}</option>
        <option value=">=">${">="}</option>
        <option value="LIKE">LIKE</option>
        <option value="BETWEEN">BETWEEN</option>
      </select>
    </label>
    <label>
      <input type="checkbox" class="notToggle"> NOT
    </label>
    <label>
      value: <input type="text" class="valueInput" placeholder="value">
    </label>
    <label class="betweenSecond" style="display: none;">
      and: <input type="text" class="secondValueInput" placeholder="second value">
    </label>
    <button class="removeClause">remove</button>
  `;

  // Populate column dropdown if the selected table is 'creature'
  if (table === 'creature') {
    const columnSelect = clause.querySelector(".columnInput");

    // Clear existing options
    columnSelect.innerHTML = "<option value=''>Select column</option>";

    // Iterate over creatureColumns to populate the dropdown with column names
    for (const columnName in creatureColumns) {
      const option = document.createElement("option");
      option.value = creatureColumns[columnName];  // Set the actual column identifier
      option.textContent = columnName;  // Set the user-friendly column name
      columnSelect.appendChild(option);
    }
  }

  // Populate column dropdown if the selected table is 'passive'
  if (table === 'passive') {
    const columnSelect = clause.querySelector(".columnInput");

    // Clear existing options
    columnSelect.innerHTML = "<option value=''>Select column</option>";

    // Iterate over passiveColumns to populate the dropdown with column names
    for (const columnName in passiveColumns) {
      const option = document.createElement("option");
      option.value = passiveColumns[columnName];  // Set the actual column identifier
      option.textContent = columnName;  // Set the user-friendly column name
      columnSelect.appendChild(option);
    }
  }

  // Populate column dropdown if the selected table is 'spell'
  if (table === 'spell') {
    const columnSelect = clause.querySelector(".columnInput");

    // Clear existing options
    columnSelect.innerHTML = "<option value=''>Select column</option>";

    // Iterate over spellColumns to populate the dropdown with column names
    for (const columnName in spellColumns) {
      const option = document.createElement("option");
      option.value = spellColumns[columnName];  // Set the actual column identifier
      option.textContent = columnName;  // Set the user-friendly column name
      columnSelect.appendChild(option);
    }
  }

  // Populate column dropdown if the selected table is 'mat'
  if (table === 'mat') {
    const columnSelect = clause.querySelector(".columnInput");

    // Clear existing options
    columnSelect.innerHTML = "<option value=''>Select column</option>";

    // Iterate over matColumns to populate the dropdown with column names
    for (const columnName in matColumns) {
      const option = document.createElement("option");
      option.value = matColumns[columnName];  // Set the actual column identifier
      option.textContent = columnName;  // Set the user-friendly column name
      columnSelect.appendChild(option);
    }
  }

  // when operator is BETWEEN, show second value input
  const operatorSelect = clause.querySelector(".operatorSelect");
  const betweenLabel = clause.querySelector(".betweenSecond");
  operatorSelect.addEventListener("change", function() {
    if (operatorSelect.value === "BETWEEN") {
      betweenLabel.style.display = "inline-block";
    } else {
      betweenLabel.style.display = "none";
    }
  });

  // attach remove handler for this clause
  clause.querySelector(".removeClause").addEventListener("click", () => {
    clause.remove();
  });

  return clause;
}


document.getElementById("tableSelect").addEventListener("change", function() {
  const table = this.value;
  const columnSelects = document.getElementById("columnSelectContainer");
  if (!columnSelects) return; // Check if the container exists
  console.log("Selected table: ", table);

  // Update the column dropdowns based on the selected table
  columnSelects.innerHTML = ""; // Clear existing options
  if (table === 'creature') {
    for (const columnName in creatureColumns) {
      const option = document.createElement("input");
      option.type = "checkbox";
      option.value = creatureColumns[columnName];
      const label = document.createElement("label");
      label.textContent = columnName;
      label.appendChild(option);
      columnSelects.appendChild(label);
      columnSelects.appendChild(document.createElement("br")); // Add line break for better readability
    }
  } else if (table === 'passive') {
    for (const columnName in passiveColumns) {
      const option = document.createElement("input");
      option.type = "checkbox";
      option.value = passiveColumns[columnName];
      const label = document.createElement("label");
      label.textContent = columnName;
      label.appendChild(option);
      columnSelects.appendChild(label);
      columnSelects.appendChild(document.createElement("br")); // Add line break for better readability
    }
  } else if (table === 'spell') {
    for (const columnName in spellColumns) {
      const option = document.createElement("input");
      option.type = "checkbox";
      option.value = spellColumns[columnName];
      const label = document.createElement("label");
      label.textContent = columnName;
      label.appendChild(option);
      columnSelects.appendChild(label);
      columnSelects.appendChild(document.createElement("br")); // Add line break for better readability
    }
  } else if (table === 'mat') {
    for (const columnName in matColumns) {
      const option = document.createElement("input");
      option.type = "checkbox";
      option.value = matColumns[columnName];
      const label = document.createElement("label");
      label.textContent = columnName;
      label.appendChild(option);
      columnSelects.appendChild(label);
      columnSelects.appendChild(document.createElement("br")); // Add line break for better readability
    }
  } else if (table === 'rdb') {
    for (const columnName in rdbColumns) {
      const option = document.createElement("input");
      option.type = "checkbox";
      option.value = rdbColumns[columnName];
      const label = document.createElement("label");
      label.textContent = columnName;
      label.appendChild(option);
      columnSelects.appendChild(label);
      columnSelects.appendChild(document.createElement("br")); // Add line break for better readability
    }
  }
});

// attach handler to the root group buttons
const rootGroup = document.getElementById("whereGroup");
rootGroup.querySelector(".addClause").addEventListener("click", () => {
  const clause = createClause();
  rootGroup.querySelector(".group-body").appendChild(clause);
});

// recursive function to process a group element using the global operator
function processGroup(groupElement) {
  const table = document.getElementById("tableSelect").value;
  const globalLogic = document.getElementById("globalLogicOperator").value;
  const fragments = [];
  let params = [];
  
  // process each child in the group body
  const children = groupElement.querySelector(".group-body").children;
  for (let child of children) {
    if (child.classList.contains("clause")) {
      let col = child.querySelector(".columnInput").value.trim();
      if (table == "creature") {
        if (creatureColumns[col] !== undefined) {
          col = creatureColumns[col];
        }
      } else if (table == "passive") {
        if (passiveColumns[col] !== undefined) {
          col = passiveColumns[col];
        }
      } else if (table == "spell") {
        if (spellColumns[col] !== undefined) {
          col = spellColumns[col];
        }
      } else if (table == "mat") {
        if (matColumns[col] !== undefined) {
          col = matColumns[col];
        }
      } else if (table == "rdb") {
        if (rdbColumns[col] !== undefined) {
          col = rdbColumns[col];
        }
      }
      const op = child.querySelector(".operatorSelect").value;
      const notChecked = child.querySelector(".notToggle").checked;
      const valStr = child.querySelector(".valueInput").value;
      const val = parseInt(valStr) || valStr; // parse as int if possible
      
      if (op === "BETWEEN") {
        const secondValStr = child.querySelector(".secondValueInput").value;
        const secondVal = parseInt(secondValStr) || secondValStr; // parse as int if possible
        if (col !== "" && val !== "" && secondVal !== "") {
          let clauseStr = `${col} BETWEEN ? AND ?`;
          if (notChecked) clauseStr = "NOT (" + clauseStr + ")";
          fragments.push(clauseStr);
          params.push(val, secondVal);
        }
      } else {
        if (col !== "" && val !== "") {
          let clauseStr = `${col} ${op} ?`;
          if (notChecked) clauseStr = "NOT " + clauseStr;
          fragments.push(clauseStr);
          params.push(val);
        }
      }
    }
  }
  
  // join all fragments using the global logic operator
  const fragment = fragments.join(" " + globalLogic + " ");
  return { fragment, params };
}

// generate query button handler
document.getElementById("generateQuery").addEventListener("click", function(){
  const table = document.getElementById("tableSelect").value;
  const columns = Array.from(document.querySelectorAll("#columnSelectContainer input:checked")).map(input => input.value).join(", ");
  if (columns === "") {
    alert("Please select at least one column to query.");
    return;
  }
  let query = "SELECT " + columns + " FROM " + table;
  let params = [];
  
  const result = processGroup(document.getElementById("whereGroup"));
  if (result.fragment) {
    query += " WHERE " + result.fragment;
    params = result.params;
  }
  query += ";";
  
  document.getElementById("output").textContent = 
    "query:\n" + query + "\n\nparams:\n" + JSON.stringify(params, null, 2);

  console.log("Generated Query: ", query);
  console.log("Query Parameters: ", params);

  const stmt = db.prepare(query);
  stmt.bind(params);

  // Array to store result rows
  const resultSet = [];
  
  // Execute the query and fetch all rows
  while (stmt.step()) {
    // Get the current row as an object with column names as keys
    const row = stmt.getAsObject();
    resultSet.push(row);
  }

  // Log the result set for debugging purposes
  console.log(resultSet);

  // Render the results if there are any rows
  if (resultSet.length > 0) {
    let headers = columns.split(", ").map(col => col.trim());
      
    const tableHeaders = document.getElementById("tableHeaders");
    const tableBody = document.getElementById("tableBody");

    // Clear previous results
    tableHeaders.innerHTML = '';
    tableBody.innerHTML = '';
    renderResults(headers, resultSet, table, tableHeaders, tableBody);
  } else {
    console.log("No results returned.");
  }

  // Free the statement to release resources
  stmt.free();
});


function renderResults(headers, resultSet, table, tableHeaders, tableBody) {
  // Get the headers from the result set (keys of the first row object)
  console.log("Headers: ", headers);

  headers.forEach(header => {
    const th = document.createElement("th");
    // find the column name in the creatureColumns object
    let columnsTable = creatureColumns;
    if (table === "passive") {
      columnsTable = passiveColumns;
    } else if (table === "spell") {
      columnsTable = spellColumns;
    } else if (table === "mat") {
      columnsTable = matColumns;
    } else if (table === "rdb") {
      columnsTable = rdbColumns;
    }

    const columnName = Object.keys(columnsTable).find(key => columnsTable[key] === header);
    th.textContent = columnName || header; // Use the friendly name or fallback to the header
    tableHeaders.appendChild(th);
  });


  // Render table rows
  resultSet.forEach(row => {
    const tr = document.createElement("tr");
    headers.forEach(header => {
      const td = document.createElement("td");
      let textContent = processFormattedText(row[header]);
      joins.forEach(join => {
        if (join.table1 === table) {
          if (header === join.col1) {
            const joinStmt = db.prepare(`SELECT ${join.returns.join(", ")} FROM ${join.table2} WHERE ${join.col2} = ?`);
            joinStmt.bind([row[header]]);
            if (joinStmt.step()) {
              const joinRow = joinStmt.getAsObject();
              const joinText = join.returns.map(col => joinRow[col]).join(": ");
              textContent = processFormattedText(joinText); // Access value by column name
            } else {
              textContent = "N/A"; // No join result found
            }
          }
        }
      });
      td.innerHTML = textContent; // Access value by column name
      tr.appendChild(td);
      if (table === "creature" && header == "column3") {
        const img = document.createElement("img");
        img.src = "images/Creatures/spr_crits_battle_centered_" + textContent + ".png";
        img.alt = "Battle Sprite";
        img.style.width = "50px"; // Set width for the image
        img.style.height = "50px"; // Set height for the image
        // loading="lazy" lazy load
        img.setAttribute("loading", "lazy");
        td.appendChild(img);
      }
    });
    tableBody.appendChild(tr);
  });
}

// currently a placeholder function for processing formatted text
function processFormattedText(text) {
  return text
}
  
  

  class Creature {
    constructor(name) {
      this.name = name;
      this._loadCreature();
    }
  
    _loadCreature() {
      const stmt = db.prepare("SELECT * FROM creature WHERE column9 = ?;");
      stmt.bind([this.name]);
    
      // Try using step() or getAsObject for prepared statements
      if (stmt.step()) {
        const row = stmt.getAsObject();
        this.class = row.column4; // column4
        this.nickname = row.column10; // column10
        this.race = row.column13; // column13
        this.passive = row.column12; // column12
        this.attack = row.column2; // column2
        this.battleSprite = row.column3; // column3
        this.defense = row.column5; // column5
        this.health = row.column6; // column6
        this.intelligence = row.column7; // column7
        this.speed = row.column14; // column14
        this.overworldSprite = row.column11; // column11
        this.tags = row.column16; // column16 (Tags)
      } else {
        console.error(`Creature with name ${this.name} not found.`);
      }
    
      stmt.free(); // don't forget to free the prepared statement
    }
    
      
    // Save the current state of the creature back to the database
    _saveCreature() {
      // Start by preparing the update query with placeholders for bound values
      const query = `
        UPDATE creature 
        SET column4 = ?,  -- Class
            column10 = ?, -- Nickname
            column13 = ?, -- Race
            column12 = ?, -- Passive
            column2 = ?,  -- Attack
            column3 = ?,  -- BattleSprite
            column5 = ?,  -- Defense
            column6 = ?,  -- Health
            column7 = ?,  -- Intelligence
            column14 = ?, -- Speed
            column11 = ?,  -- OverworldSprite
            column16 = ? -- Tags
        WHERE column9 = ?;  -- WHERE Name (column9)
      `;
      
      // Prepare the SQL statement
      const stmt = db.prepare(query);

      // Bind the current creature's properties to the prepared statement
      stmt.bind([
        this.class,            // column4
        this.nickname,         // column10
        this.race,             // column13
        this.passive,          // column12
        this.attack,           // column2
        this.battleSprite,     // column3
        this.defense,          // column5
        this.health,           // column6
        this.intelligence,     // column7
        this.speed,            // column14
        this.overworldSprite,  // column11
        this.tags,            // column16 (Tags)
        this.name              // column9 (for WHERE clause)
      ]);

      // Execute the statement
      stmt.step();

      // Free the prepared statement
      stmt.free();
    }

    // "Duplicate" the creature by creating a new entry in the database
    _duplicateCreature() {
      const newName = "Shiny " + this.nickname; // Create a new name for the duplicate
      const query = `
        INSERT INTO creature (column4, column10, column13, column12, column2, column3, column5, column6, column7, column14, column11, column9, column8, column15, column16, column1)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      const stmt = db.prepare(query);

      const nextID = parseInt(db.exec("SELECT MAX(column1) FROM creature")[0].values[0]) + 1 // column1 (ID)

      console.log("Next ID: ", nextID); // Log the next ID for debugging

      stmt.bind([
        this.class,            // column4
        this.nickname,         // column10
        this.race,             // column13
        this.passive,          // column12
        this.attack + 5,           // column2
        this.battleSprite,     // column3
        this.defense + 5,          // column5
        this.health + 10,           // column6
        this.intelligence + 5,     // column7
        this.speed + 10,            // column14
        this.overworldSprite,  // column11
        newName,              // column9
        0, // column8 (Mana)
        0, // column15 (Tier)
        "CUSTOM SHINY CREATURE", // column16 (Tags)
        nextID
      ]);

      // Execute the statement
      stmt.step();

      // Free the prepared statement
      stmt.free();

    }


    // "Delete" the creature by setting its attributes instead of removing it
    _deleteCreature() {
      // Change its attributes as specified
      this.passive = 919; // Disabled Trait
      this.attack = 1;
      this.defense = 1;
      this.health = 1;
      this.intelligence = 1;
      this.speed = 1;
      this.tags = "DELETED CREATURE"; // Set a tag to indicate deletion

      // Save these changes to the database
      this._saveCreature();
    }
  
    // Getter for creature properties to make it easier to access and edit
    get properties() {
      return {
        class: this.class,
        nickname: this.nickname,
        race: this.race,
        passive: this.passive,
        attack: this.attack,
        battleSprite: this.battleSprite,
        defense: this.defense,
        health: this.health,
        intelligence: this.intelligence,
        speed: this.speed,
        overworldSprite: this.overworldSprite
      };
    }
  
    // Setter for creature properties (edit and save changes)
    set properties(updatedProperties) {
      for (let prop in updatedProperties) {
        if (updatedProperties.hasOwnProperty(prop) && this.hasOwnProperty(prop)) {
          this[prop] = updatedProperties[prop];
        }
      }
      this._saveCreature();
    }
  }
  



// Randomizer Manager
document.getElementById("toggleCreatureManager").addEventListener("click", function() {
  const creatureManager = document.getElementById("creatureManager");

  // Make the creature manager visible or hidden
  creatureManager.style.display = creatureManager.style.display === "none" ? "block" : "none";
});
// Toggle Stat Randomization Options
document.getElementById("randomizeStats").addEventListener("change", function() {
  const statOptions = document.getElementById("statRandomizationOptions");
  
  // Show or hide the stat sliders based on checkbox state
  statOptions.style.display = this.checked ? "block" : "none";
});

// Function to update slider value display
function updateSliderValue(sliderId, valueId) {
  document.getElementById(sliderId).addEventListener("input", function() {
    document.getElementById(valueId).textContent = this.value;
  });
}

// Attach event listeners to each stat slider
updateSliderValue("randomizeHealth", "healthValue");
updateSliderValue("randomizeAttack", "attackValue");
updateSliderValue("randomizeDefense", "defenseValue");
updateSliderValue("randomizeIntelligence", "intelligenceValue");
updateSliderValue("randomizeSpeed", "speedValue");

// Toggle Blacklist UI
document.getElementById("blacklistRaces").addEventListener("change", function() {
  const blacklistContainer = document.getElementById("blacklistContainer");
  blacklistContainer.style.display = this.checked ? "block" : "none";
});

// Function to add race to blacklist
document.getElementById("addRaceButton").addEventListener("click", function() {
  const raceInput = document.getElementById("raceInput");
  const raceName = raceInput.value.trim();

  if (raceName === "") return; // Ignore empty input

  const listItem = document.createElement("li");
  listItem.textContent = raceName;

  // Add remove button
  const removeButton = document.createElement("button");
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", function() {
    listItem.remove();
  });

  listItem.appendChild(removeButton);
  document.getElementById("blacklistRacesList").appendChild(listItem);

  raceInput.value = ""; // Clear input field
});

// Grouping checkboxes
const groupByRace = document.getElementById("groupByRace");
const groupByClass = document.getElementById("groupByClass");

function enforceExclusiveSelection(selected, other) {
  if (selected.checked) {
    other.checked = false;
  }
}

groupByRace.addEventListener("change", function() {
  enforceExclusiveSelection(groupByRace, groupByClass);
});

groupByClass.addEventListener("change", function() {
  enforceExclusiveSelection(groupByClass, groupByRace);
});

// Function to get the list of blacklisted races
function getBlacklistedRaces() {
  const blacklistRaces = [];
  const listItems = document.getElementById("blacklistRacesList").getElementsByTagName("li");

  // Loop through each blacklist list item and get the race name
  for (let item of listItems) {
    blacklistRaces.push(item.textContent.replace("Remove", "").trim());
  }

  return blacklistRaces;
}

// Function to get creatures not in the blacklist
function getCreaturesNotInBlacklist(blacklistRacesArray) {
  // Escape the blacklist array into a comma-separated string for SQL query
  const blacklistString = blacklistRacesArray.map(race => `'${race}'`).join(',');

  // SQL query to select creatures whose race is NOT in the blacklist
  const query = `
    SELECT * FROM creature
    WHERE column13 NOT IN (${blacklistString});
  `;

  // Execute the query using SQL.js
  const result = db.exec(query);

  // Return the result (all creatures whose race is not in the blacklist)
  return result[0];
}
// helper: get a random class from a predefined list
function getRandomClass() {
  const classes = ["Chaos", "Sorcery", "Nature", "Death", "Life"];
  return classes[Math.floor(Math.random() * classes.length)];
}

// function to fetch creature names not in the blacklist using a prepared statement
function getCreatureNamesNotInBlacklist(blacklistRacesArray) {
  let query = "SELECT column9, column13 FROM creature";
  // if blacklist is not empty, add WHERE clause with prepared statement placeholders
  if (blacklistRacesArray.length > 0) {
    // create a list of '?' placeholders for each blacklisted race
    const placeholders = blacklistRacesArray.map(() => "?").join(",");
    query += ` WHERE column13 NOT IN (${placeholders})`;
  }
  const stmt = db.prepare(query);
  if (blacklistRacesArray.length > 0) {
    stmt.bind(blacklistRacesArray);
  }
  const creatureNames = [];
  const racesByName = {}; // map creature name to its race
  while (stmt.step()) {
    const row = stmt.getAsObject();
    creatureNames.push(row.column9);
    racesByName[row.column9] = row.column13;
  }
  stmt.free();
  return { creatureNames, racesByName };
}

// randomize button logic extension for classes using the ORM and prepared statements
document.getElementById("randomizeButton").addEventListener("click", function() {
  // get blacklisted races from the ui
  const blacklistRacesArray = getBlacklistedRaces();

  // fetch creature names (and their races) that are not blacklisted
  const { creatureNames, racesByName } = getCreatureNamesNotInBlacklist(blacklistRacesArray);

  // load ORM objects for each creature
  const creatures = creatureNames.map(name => new Creature(name));

  if (blacklistRacesArray.length > 0) {
    // check to delete creatures in the blacklist
    const deleteCreatures = document.getElementById("deleteBlacklistedCreatures").checked;
    if (deleteCreatures) {
      let query = "SELECT column9 FROM creature";
      // if blacklist is not empty, add WHERE clause with prepared statement placeholders
      if (blacklistRacesArray.length > 0) {
        // create a list of '?' placeholders for each blacklisted race
        const placeholders = blacklistRacesArray.map(() => "?").join(",");
        query += ` WHERE column13 IN (${placeholders})`;
      }
      const stmt = db.prepare(query);
      if (blacklistRacesArray.length > 0) {
        stmt.bind(blacklistRacesArray);
      }
      const creatureNames = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        creatureNames.push(row.column9);
      }
      stmt.free();

      // delete each creature in the blacklist
      creatureNames.forEach(name => {
        const creature = new Creature(name);
        creature._deleteCreature(); // delete the creature by setting its attributes
      });
    }
  }

  const addShinies = document.getElementById("addShinies").checked;
  if (addShinies) {
    // fetch creature names (and their races) that are not blacklisted
    const { creatureNames, racesByName } = getCreatureNamesNotInBlacklist(blacklistRacesArray);

    // load ORM objects for each creature
    const creatures = creatureNames.map(name => new Creature(name));
    for (let i = 0; i < 100; i++) {
      const randomIndex = Math.floor(Math.random() * creatures.length);
      const creature = creatures[randomIndex];
      const shinyCreature = new Creature(creature.name);
      shinyCreature._duplicateCreature(); // duplicate the creature
    }
  }

  // check if randomize classes is enabled
  const groupByRace = document.getElementById("groupByRace").checked;
  const groupByClass = document.getElementById("groupByClass").checked;

  if (groupByRace && groupByClass) {
    alert("Please select only one grouping method.");
    return;
  }

  if (!groupByRace && !groupByClass) {
    alert("Please select a grouping method.");
    return;
  }

  const randomizePassives = document.getElementById("randomizePassives").checked;
  if (groupByRace) {
    if (randomizePassives) {
      // group creatures by race
      const grouped = creatures.reduce((acc, creature) => {
        const race = creature.race;
        if (!acc[race]) {
          acc[race] = [];
        }
        acc[race].push(creature);
        return acc;
      }, {});

      // for each race group, swap 2 random members' passives 20 times
      for (const race in grouped) {
        const creaturesInRace = grouped[race]
        const numCreatures = creaturesInRace.length;
        if (numCreatures > 1) {
          for (let i = 0; i < 20; i++) {
            // Pick two random creatures
            const index1 = Math.floor(Math.random() * numCreatures);
            const index2 = Math.floor(Math.random() * numCreatures);

            // Ensure the two indices are not the same
            if (index1 !== index2) {
              const creature1 = creaturesInRace[index1];
              const creature2 = creaturesInRace[index2];

              // Swap their passives
              const tempPassive = creature1.passive;
              creature1.properties = { passive: creature2.passive };
              creature2.properties = { passive: tempPassive };
            }
          }
        }
      }
    }
    if (document.getElementById("randomizeClasses").checked) {
      
      if (groupByRace) {
        // group creatures by their race
        const grouped = creatures.reduce((acc, creature) => {
          const race = creature.race;
          if (!acc[race]) {
            acc[race] = [];
          }
          acc[race].push(creature);
          return acc;
        }, {});

        // for each race group, assign the same random class
        for (const race in grouped) {
          const randomClass = getRandomClass();
          grouped[race].forEach(creature => {
            creature.properties = { class: randomClass };
          });

        }
      } else {
        // individually randomize each creature's class
        creatures.forEach(creature => {
          const randomClass = getRandomClass();
          creature.properties = { class: randomClass };
        });
      }


    }
    if (document.getElementById("randomizeRaces").checked) {
      if (groupByClass) {
        // group creatures by their class
        const grouped = creatures.reduce((acc, creature) => {
          const className = creature.class;
          if (!acc[className]) {
            acc[className] = [];
          }
          acc[className].push(creature);
          return acc;
        }, {});

        // for each class group, initiate 1000 2 way random swaps between creatures
        // for each class group, initiate 1000 2-way random swaps between creatures
        for (const className in grouped) {
          const creaturesInClass = grouped[className];
          const numCreatures = creaturesInClass.length;

          if (numCreatures > 1) {
            for (let i = 0; i < 1000; i++) {
              // Pick two random creatures in the same class group
              const index1 = Math.floor(Math.random() * numCreatures);
              const index2 = Math.floor(Math.random() * numCreatures);

              // Ensure the two indices are not the same
              if (index1 !== index2) {
                const creature1 = creaturesInClass[index1];
                const creature2 = creaturesInClass[index2];

                // Swap their races
                const tempRace = creature1.race;
                creature1.properties = { race: creature2.race };
                creature2.properties = { race: tempRace };
                
              }
            }
          }
        }
      }
    }
  }

  if (groupByClass) { // todo: finish this
    if (randomizePassives) {
      // group creatures by class
      const grouped = creatures.reduce((acc, creature) => {
        const cclass = creature.class;
        if (!acc[cclass]) {
          acc[cclass] = [];
        }
        acc[cclass].push(creature);
        return acc;
      }, {});

      // for each class group, swap 2 random members' passives 500 times
      for (const cclass in grouped) {
        const creaturesInClass = grouped[cclass]
        const numCreatures = creaturesInClass.length;
        if (numCreatures > 1) {
          for (let i = 0; i < 500; i++) {
            // Pick two random creatures
            const index1 = Math.floor(Math.random() * numCreatures);
            const index2 = Math.floor(Math.random() * numCreatures);

            // Ensure the two indices are not the same
            if (index1 !== index2) {
              const creature1 = creaturesInClass[index1];
              const creature2 = creaturesInClass[index2];

              // Swap their passives
              const tempPassive = creature1.passive;
              creature1.properties = { passive: creature2.passive };
              creature2.properties = { passive: tempPassive };
            }
          }
        }
      }
    }
    if (document.getElementById("randomizeRaces").checked) {
      if (groupByClass) {
        // group creatures by their class
        const grouped = creatures.reduce((acc, creature) => {
          const className = creature.class;
          if (!acc[className]) {
            acc[className] = [];
          }
          acc[className].push(creature);
          return acc;
        }, {});

        // for each class group, initiate 1000 2 way random swaps between creatures
        // for each class group, initiate 1000 2-way random swaps between creatures
        for (const className in grouped) {
          const creaturesInClass = grouped[className];
          const numCreatures = creaturesInClass.length;

          if (numCreatures > 1) {
            for (let i = 0; i < 1000; i++) {
              // Pick two random creatures in the same class group
              const index1 = Math.floor(Math.random() * numCreatures);
              const index2 = Math.floor(Math.random() * numCreatures);

              // Ensure the two indices are not the same
              if (index1 !== index2) {
                const creature1 = creaturesInClass[index1];
                const creature2 = creaturesInClass[index2];

                // Swap their races
                const tempRace = creature1.race;
                creature1.properties = { race: creature2.race };
                creature2.properties = { race: tempRace };
              }
            }
          }
        }
      }
    }
    if (document.getElementById("randomizeClasses").checked) {

      if (groupByRace) {
        // group creatures by their race
        const grouped = creatures.reduce((acc, creature) => {
          const race = creature.race;
          if (!acc[race]) {
            acc[race] = [];
          }
          acc[race].push(creature);
          return acc;
        }, {});

        // for each race group, assign the same random class
        for (const race in grouped) {
          const randomClass = getRandomClass();
          grouped[race].forEach(creature => {
            creature.properties = { class: randomClass };
          });
        }
      } else {
        // individually randomize each creature's class
        creatures.forEach(creature => {
          const randomClass = getRandomClass();
          creature.properties = { class: randomClass };
        });
      }
    }
  }

  if (document.getElementById("randomizeStats").checked) {
    const randomizedHealthAmount = parseInt(document.getElementById("randomizeHealth").value) || 0;
    const randomizedAttackAmount = parseInt(document.getElementById("randomizeAttack").value) || 0;
    const randomizedDefenseAmount = parseInt(document.getElementById("randomizeDefense").value) || 0;
    const randomizedIntelligenceAmount = parseInt(document.getElementById("randomizeIntelligence").value) || 0;
    const randomizedSpeedAmount = parseInt(document.getElementById("randomizeSpeed").value) || 0;
    // Randomize stats for each creature
    creatures.forEach(creature => {
      const properties = creature.properties;
      creature.properties = {
        health: Math.floor(properties.health + (randomizedHealthAmount * Math.random())),
        attack: Math.floor(properties.attack + (randomizedAttackAmount * Math.random())),
        defense: Math.floor(properties.defense + (randomizedDefenseAmount * Math.random())),
        intelligence: Math.floor(properties.intelligence + (randomizedIntelligenceAmount * Math.random())),
        speed: Math.floor(properties.speed + (randomizedSpeedAmount * Math.random()))
      };
    });
  }
});




class PlannerCreature {
  constructor() {
    this.creature1ID = -1;
    this.creature2ID = -1;
    this.artifactMaterials = [];
    this.artifactTraits = [];
    this.artifactSpell = -1;
    this.spells = [];
  }

  setCreature1(id) {
    if (typeof id === 'string') {
      const nameCol = creatureColumns["Name"];
      const stmt = db.prepare(`SELECT column1 FROM creature WHERE ${nameCol} = ?`);
      stmt.bind([id]);
      if (stmt.step()) {
        this.creature1ID = stmt.getAsObject().column1;
        console.log("Creature 1 ID: ", this.creature1ID); // Log the ID for debugging
      } else {
        alert(`creature "${id}" not found`);
      }
    } else {
      this.creature1ID = Number(id) || -1;
    }
    return this;
  }
  
  setCreature2(id) {
    if (typeof id === 'string') {
      const nameCol = creatureColumns["Name"];
      const stmt = db.prepare(`SELECT column1 FROM creature WHERE ${nameCol} = ?`);
      stmt.bind([id]);
      if (stmt.step()) {
        this.creature2ID = stmt.getAsObject().column1;
      } else {
        alert(`creature "${id}" not found`);
      }
    } else {
      this.creature2ID = Number(id) || -1;
    }
    return this;
  }
  
  setArtifactSpell(spellId) {
    if (typeof spellId === 'string') {
      const nameCol = spellColumns["Name"];
      const stmt = db.prepare(`SELECT column1 FROM spell WHERE ${nameCol} = ?`);
      stmt.bind([spellId]);
      if (stmt.step()) {
        this.artifactSpell = stmt.getAsObject().column1;
      } else {
        alert(`spell "${spellId}" not found`);
      }
    } else {
      this.artifactSpell = Number(spellId) || -1;
    }
    return this;
  }
  
  addSpell(spellId) {
    if (typeof spellId === 'string') {
      const nameCol = spellColumns["Name"];
      const stmt = db.prepare(`SELECT column1 FROM spell WHERE ${nameCol} = ?`);
      stmt.bind([spellId]);
      if (stmt.step()) {
        this.spells.push(stmt.getAsObject().column1);
      } else {
        alert(`spell "${spellId}" not found`);
      }
    } else if (Number.isInteger(spellId)) {
      this.spells.push(spellId);
    }
    return this;
  }
  
  addArtifactMaterial(materialId) {
    if (typeof materialId === 'string') {
      const nameCol = matColumns["Name"];
      const stmt = db.prepare(`SELECT column1 FROM mat WHERE ${nameCol} = ?`);
      stmt.bind([materialId]);
      if (stmt.step()) {
        this.artifactMaterials.push(stmt.getAsObject().column1);
      } else {
        alert(`material "${materialId}" not found`);
      }
    } else if (Number.isInteger(materialId)) {
      this.artifactMaterials.push(materialId);
    }
    return this;
  }

  addArtifactTrait(traitId) {
    if (typeof traitId === 'string') {
      const nameCol = passiveColumns["Name"];
      const stmt = db.prepare(`SELECT column1 FROM passive WHERE ${nameCol} = ?`);
      stmt.bind([traitId]);
      if (stmt.step()) {
        this.artifactTraits.push(stmt.getAsObject().column1);
      } else {
        alert(`passive "${traitId}" not found`);
      }
    }
    else if (Number.isInteger(traitId)) {
      this.artifactTraits.push(traitId);
    }
    return this;
  }
  

  popArtifactMaterial() {
    this.artifactMaterials.pop();
    return this;
  }

  popArtifactTrait() {
    this.artifactTraits.pop();
    return this;
  }

  popSpell() {
    this.spells.pop();
    return this;
  }

  reset() {
    this.creature1ID = -1;
    this.creature2ID = -1;
    this.artifactMaterials = [];
    this.artifactSpell = -1;
    this.spells = [];

    return this;
  }

  getData() {
    const resolveOne = (table, id) => {
      if (id === -1) return null;
      const stmt = db.prepare(`SELECT * FROM ${table} WHERE column1 = ?`);
      stmt.bind([id]);
      return stmt.step() ? stmt.getAsObject() : null;
    };
  
    const resolveMany = (table, ids) => {
      return ids
        .map(id => {
          if (id === -1) return null;
          const stmt = db.prepare(`SELECT * FROM ${table} WHERE column1 = ?`);
          stmt.bind([id]);
          return stmt.step() ? stmt.getAsObject() : null;
        })
        .filter(x => x !== null);
    };
  
    return {
      creature1: resolveOne("creature", this.creature1ID),
      creature2: resolveOne("creature", this.creature2ID),
      artifactMaterials: resolveMany("mat", this.artifactMaterials),
      artifactTraits: resolveMany("passive", this.artifactTraits),
      artifactSpell: resolveOne("spell", this.artifactSpell),
      spells: resolveMany("spell", this.spells)
    };
  }


  toHTML() {
    const data = this.getData();
    const container = document.createElement('div');
    container.className = 'planner-creature-data';
    container.style = "overflow:auto; overflow-x: auto; max-height: 700px; position: relative;";
  
    // Helper function to create and pass table headers and bodies
    const createTableAndRender = (columns, resultSet, tableName) => {
      const tableHeaders = document.createElement('thead');
      const tableBody = document.createElement('tbody');
      
      // Only render the table if resultSet exists
      if (resultSet) {
        renderResults(columns, [resultSet], tableName, tableHeaders, tableBody);
      }
  
      const table = document.createElement('table');
      table.appendChild(tableHeaders);
      table.appendChild(tableBody);
      return table;
    };
  
    // Render for Creature 1
    const creature1Data = data.creature1;
    if (creature1Data) {
      const creature1Text = document.createElement('h5');
      creature1Text.textContent = "Creature 1"
      container.appendChild(creature1Text);
      const creatureTable = createTableAndRender(Object.values(creatureColumns), creature1Data, 'creature');
      const creature1Div = document.createElement('div');
      creature1Div.appendChild(creatureTable);
      container.appendChild(creature1Div);
    }
  
    // Render for Creature 2
    const creature2Data = data.creature2;
    if (creature2Data) {
      const creature2Text = document.createElement('h5');
      creature2Text.textContent = "Creature 2"
      container.appendChild(creature2Text);
      const creatureTable = createTableAndRender(Object.values(creatureColumns), creature2Data, 'creature');
      const creature2Div = document.createElement('div');
      creature2Div.appendChild(creatureTable);
      container.appendChild(creature2Div);
    }
  
    // Render for Artifact Spell
    const artifactSpellData = data.artifactSpell;
    if (artifactSpellData) {
      const artifactSpellText = document.createElement('h5');
      artifactSpellText.textContent = "Artifact Spell"
      container.appendChild(artifactSpellText);
      const artifactSpellTable = createTableAndRender(Object.values(spellColumns), artifactSpellData, 'spell');
      const artifactSpellDiv = document.createElement('div');
      artifactSpellDiv.appendChild(artifactSpellTable);
      container.appendChild(artifactSpellDiv);
    }
  
    // Render for Artifact Materials
    const artifactMaterialsData = data.artifactMaterials;
    if (artifactMaterialsData.length > 0) {
      const artifactMaterialsText = document.createElement('h5');
      artifactMaterialsText.textContent = "Artifact Materials"
      container.appendChild(artifactMaterialsText);
      artifactMaterialsData.forEach(material => {
        const materialTable = createTableAndRender(Object.values(matColumns), material, 'mat');
        const materialDiv = document.createElement('div');
        materialDiv.appendChild(materialTable);
        container.appendChild(materialDiv);
      });
    }

    // Render for Artifact Traits
    const artifactTraitsData = data.artifactTraits;
    if (artifactTraitsData.length > 0) {
      const artifactTraitsText = document.createElement('h5');
      artifactTraitsText.textContent = "Artifact Traits"
      container.appendChild(artifactTraitsText);
      artifactTraitsData.forEach(trait => {
        const traitTable = createTableAndRender(Object.values(passiveColumns), trait, 'passive');
        const traitDiv = document.createElement('div');
        traitDiv.appendChild(traitTable);
        container.appendChild(traitDiv);
      });
    }
    
  
    // Render for Spells
    const spellsData = data.spells;
    if (spellsData.length > 0) {
      const spellsText = document.createElement('h5');
      spellsText.textContent = "Spells"
      container.appendChild(spellsText);
      spellsData.forEach(spell => {
        const spellTable = createTableAndRender(Object.values(spellColumns), spell, 'spell');
        const spellDiv = document.createElement('div');
        spellDiv.appendChild(spellTable);
        container.appendChild(spellDiv);
      });
    }
  
    return container;
  }
  
  
  
}


let plannerCreatures = {
  creature1: new PlannerCreature(),
  creature2: new PlannerCreature(),
  creature3: new PlannerCreature(),
  creature4: new PlannerCreature(),
  creature5: new PlannerCreature(),
  creature6: new PlannerCreature(),
};


document.getElementById('toggleBuildPlanner').addEventListener('click', () => {
  const content = document.getElementById('buildPlannerContent');
  const isHidden = content.style.display === 'none';
  content.style.display = isHidden ? 'block' : 'none';

  content.innerHTML = ''; // Clear previous content (if you need to re-render)

  Object.values(plannerCreatures).forEach((creature, index) => {
    const planner = creature;
    const fields = [
      { label: "Set Creature 1", method: "setCreature1" },
      { label: "Set Fusion Creature 2", method: "setCreature2" },
      { label: "Set Artifact Spell", method: "setArtifactSpell" },
      { label: "Add Spell", method: "addSpell" },
      { label: "Add Artifact Material", method: "addArtifactMaterial" },
      { label: "Add Artifact Trait", method: "addArtifactTrait" },
    ];

    const buttonFields = [
      { label: "Pop Artifact Material", method: "popArtifactMaterial" },
      { label: "Pop Artifact Trait", method: "popArtifactTrait" },
      { label: "Pop Spell", method: "popSpell" },
      { label: "Reset", method: "reset" }
    ];

    const div = document.createElement('div');
    const h5 = document.createElement('h5');
    h5.textContent = `Manage Creature ${index + 1}`;
    div.appendChild(h5);
    content.appendChild(div);

    const div2 = document.createElement('div');
    div2.className = 'planner-creature-data';
    div2.dataset.correspondingCreature = index + 1; // Store the corresponding creature object
    content.appendChild(div2);

    // Generate fields
    fields.forEach(({ label, method }) => {
      const container = document.createElement('div');

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = label;

      const button = document.createElement('button');
      button.textContent = label;
      button.addEventListener('click', () => {
        const val = input.value;
        console.log("Value: ", val); // Log the value for debugging
        planner[method](val);
        input.value = ''; // clear input after setting value
        const newHTML = planner.toHTML();
        div2.innerHTML = ''; // Clear previous content
        div2.appendChild(newHTML); // Append new content
      });

      container.appendChild(input);
      container.appendChild(button);
      div.appendChild(container);
    });

    // Generate button fields (Pop, Reset)
    buttonFields.forEach(({ label, method }) => {
      const button = document.createElement('button');
      button.textContent = label;
      button.addEventListener('click', () => {
        planner[method]();
        const newHTML = planner.toHTML();
        div2.innerHTML = ''; // Clear previous content
        div2.appendChild(newHTML); // Append new content
      });
      div.appendChild(button);
    });
  });
  
  Object.values(plannerCreatures).forEach(creature => creature.reset());
});



document.getElementById('exportBuild').addEventListener('click', () => {
  const isHidden = document.getElementById('buildPlannerContent').style.display === 'none';
  if (isHidden) {
    alert("Please open the build planner to export the data.");
    return;
  }


  let buildData = JSON.stringify(plannerCreatures);
  // clipboard copy the build data
  navigator.clipboard.writeText(buildData).then(() => {
    console.log('Build data copied to clipboard!');
  }).catch(err => {
    console.error('Could not copy build data: ', err);
  });
});


document.getElementById('importBuild').addEventListener('click', async function () {
  const el = document.getElementById('buildPlannerContent');
  if (getComputedStyle(el).display === 'none') {
    return alert("please open the build planner to import the data");
  }
  
  let text;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    text = prompt("please paste the build data here:");
    if (!text) return console.error("no valid build data provided");
  }
  
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return console.error("invalid json build data:", err);
  }
  
  Object.entries(parsed).forEach(([key, data]) => {
    if (plannerCreatures[key]) {
      // shallow-merge; consider deep clone if nested properties matter
      Object.assign(plannerCreatures[key], data);
    }
  });
  
  // re-render all creatures
  Object.values(plannerCreatures).forEach((creature, idx) => {
    const container = document.querySelector(`.planner-creature-data[data-corresponding-creature="${idx+1}"]`);
    container.innerHTML = '';
    container.appendChild(creature.toHTML());
  });
});


document.getElementById('downloadBtn').addEventListener('click', () => {
  const stmt = db.prepare("SELECT * FROM creature");
  const rows = [];
  while (stmt.step()) {
    const obj = stmt.getAsObject();
    const values = Object.values(obj).map(v => v ?? '');
    rows.push(values.join('{}{}{}'));
  }

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "randomized_creature.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

document.getElementById('downloadDefaultBtn').addEventListener('click', () => {

  const filenames = [
    "creature.csv",
    "spell.csv",
    "mat.csv",
    "passive.csv",
    "rdb.csv"
  ];

  // download

  filenames.forEach(filename => {
    const link = document.createElement("a");
    link.setAttribute("href", `./${filename}`);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

});