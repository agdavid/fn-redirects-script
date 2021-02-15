const algoliasearch = require('algoliasearch');
const parse = require('csv-parse');
const fs = require('fs');

const client = algoliasearch('APP_ID', 'API_KEY');
const index = client.initIndex('index');

const checkRecord = async(record) => {
    // collect keys
    const keys = Object.keys(record);
    // check for more than one value in column 1
    const col1_values = record[keys[0]];
    const col1_split_values = col1_values.split(",");
    if (col1_split_values.length > 1) {
        // more than one value
        return true;
    } else {
        // only one value
        return false;
    }
}

const processRecord = async(record) => {
    const splitRecords = [];
    
    // collect values
    const keys = Object.keys(record);
    const key1 = keys[0];

    const col1_values = record[key1];
    const col1_split_values = col1_values.split(",");

    col1_split_values.forEach((val) => {
        const trimmedValue = val.trim();
        const newRecord = {
            ...record,
            [key1]: trimmedValue,
        };
        splitRecords.push(newRecord);
    });
    return splitRecords;

}

const createRules = async (processedRecords) => {
    const rules = [];

    for await (const ruleData of processedRecords ) {
        const keys = Object.keys(ruleData);
        const pattern = ruleData[keys[0]];
        const collectionHandle = ruleData[keys[1]];

        const ruleObject = {
            "conditions": [
              {
                "pattern": pattern,
                "anchoring": "is",
                "alternatives": false
              }
            ],
            "consequence": {
              "userData": {
                "redirect": `https://www.fashionnova.com/collections/${collectionHandle}`
              },
              "filterPromotes": true
            },
            "enabled": true,
            "description": `Redirect Collection: ${collectionHandle} by query ${pattern}`,
            "objectID": `qr-redirect-collection-${collectionHandle}-${Math.random().toString(36).slice(2)}`
          }
        rules.push(ruleObject);
    }

    const rulesResponse = await index.saveRules(rules).then((res) => {
        console.log("SUCCESS");
        console.log(res);
    }).catch((err) => {
        console.log("ERROR");
        console.error(err);
    });    

    return { 
        rules, 
        ...rulesResponse
    };
}

const processFile = async() => {
    let processedRecords = [];
    let processedRulesResponse;

    const parser = fs
    .createReadStream(__dirname+"/data/input.csv")
    .pipe(parse({
        // CSV options if any
        columns: true,
        delimiter: ",",
        trim: true,

    }));

    // create array of objects to turn into rules
    for await (const record of parser) {
        // Work with each record
        // check each record for more than one value in column 1
        const rules = [];
        const shouldBeSplit = await checkRecord(record);
        if(shouldBeSplit) {
            // true
            // split existing object into multiple objects
            const newRecords = await processRecord(record);
            processedRecords.push(...newRecords);
        } else {
            // false
            // push existing object into array
            processedRecords.push(record);
        }
        
    }

    // create rules
    processedRulesResponse = await createRules(processedRecords);

    return processedRulesResponse;
}

(async () => {
    const scriptResponse = await processFile();
    console.info(scriptResponse);
})();