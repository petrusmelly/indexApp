
// Default base year index

let baseRowIdx = 2;


// Function for finding baseYear (in case user changes it), and getting the base year's GDP
function recomputeRows(rows, baseRowIdxValue) {
    // Order rows in ascending year order for YoY and indexChange
    const sorted = [...rows].sort((a,b) => a.year - b.year);

    const baseRow = sorted.find(r => r.index === baseRowIdxValue);
    const baseGDP = baseRow?.gdp;

    // If baseGDP is missing or invalid, clear contents of derived values
    if (!baseGDP || !Number.isFinite(Number(baseGDP)) || Number(baseGDP) === 0) {
        return sorted.map(r => ({
            ...r,
            yoyPct: null,
            idx: null,
            indexChange: null,
        }));
    }

    // some placeholders for use later
    let prevGDP = null;
    let prevIdx = null;

    return sorted.map((r) => {
        const gdp = Number(r.gdp);

        // Percent change YoY (make first row blank, make sure it's a number and it's not 0, if it is--then null)
        const yoyPct = 
        (prevGDP != null && Number.isFinite(prevGDP) && prevGDP !== 0 && Number.isFinite(gdp)) ? (((gdp - prevGDP) / prevGDP) * 100) : null;

        // Index (base year should be 100)
        const idx = Number.isFinite(gdp) ? (gdp / Number(baseGDP)) * 100 : null;

        // Index change -- change from the previous years index
        const indexChange = (prevIdx != null && idx != null) ? (idx - prevIdx) : null;

        prevGDP = Number.isFinite(gdp) ? gdp : null;
        prevIdx = idx;

        return {
            ...r,
            yoyPct: yoyPct != null ? Number(yoyPct.toFixed(2)) : null,
            idx: idx != null? Number(idx.toFixed(2)) : null,
            indexChange: indexChange != null ? Number(indexChange.toFixed(2)) : null,
        };
    });
}


// Index table object with starting values and formulas. Use to populate tableData.
// These values will inform the table and chart. The user can input new values into GDP.

tableRows = [
    {
        index: 0,
        year: 2020,
        gdp: 100,
        yoyPct: null,
        idx: 38.46,
        indexChange: null
    },
    {
        index: 1,
        year: 2021,
        gdp: 175,
        yoyPct: 75.00,
        idx: 67.31,
        indexChange: 28.85
    },
    {
        index: 2,
        year: 2022,
        gdp: 260,
        yoyPct: 48.57,
        idx: 100.00,
        indexChange: 32.69
    },
    {
        index: 3,
        year: 2023,
        gdp: 410,
        yoyPct: 57.69,
        idx: 157.69,
        indexChange: 57.69
    },
     {
        index: 4,
        year: 2024,
        gdp: 605,
        yoyPct: 47.56,
        idx: 232.69,
        indexChange: 75.00
    },
];

// Create new tabulator on DOM element with id "idx-table"
const table = new Tabulator("#idx-table", {
    index: "index",
    selectableRows: 1,
    rowHeader:{
        formatter:"rowSelection", 
        titleFormatter:"rowSelection", 
        headerSort:false, resizable: false, frozen:true, 
        headerHozAlign:"center", hozAlign:"center",
        width: 50,
    },
    height: 205,
    data: tableRows,
    layout: "fitColumns",
    columns: [
        {title: "Year", field: "year", width: 150 },
        {title: "GDP", field: "gdp", width: 150, editor: "number" },
        {title: "Percent Change YoY", field: "yoyPct", width: 150,
            tooltip: function(e, cell) {
                const rowData = cell.getRow().getData();
                const index = rowData.index;
                const gdp = Number(rowData.gdp);

                // Find previous year row using Tabulator's row lookup -- this works b/c we set an index to "index". So we can traverse up and down rows using index
                const prevRow = table.getRow(index - 1);
                if (!prevRow) return `YoY%: no prior year.`;

                const prevGDP = Number(prevRow.getData().gdp);

                const yoy = ((gdp - prevGDP) / prevGDP) * 100;

                // Tool tip text with substituted numbers + basic formula
                return `YoY% = ((${gdp} - ${prevGDP}) / ${prevGDP}) × 100 = ${yoy.toFixed(2)}% <br><br> ((New - Old) / Old)* 100`;
            },
         },
        {title: "Index", field: "idx", width: 150,
            tooltip: function(e, cell) {
                const rowData = cell.getRow().getData();
                const gdp = Number(rowData.gdp);
                const baseYearRow = table.getRow(baseRowIdx);
                const baseGDP = Number(baseYearRow.getData().gdp);
                const idxValue = rowData.idx;

                // Tool tip text with substituted numbers + basic formula
                return `Index = (${gdp} / ${baseGDP}) * 100 = ${idxValue} <br><br> (This Year's GDP / Base Year GDP)`;

            },
         },
        {title: "Δ Index", field: "indexChange", width: 150,
            tooltip: function(e, cell) {
                const rowData = cell.getRow().getData();
                
                const rowId = rowData.index; // row key/id 1, 2, 3, 4...

                const currIdx = Number(rowData.idx); // horrible naming convention on my part, but idx is the GDP index value

                const prevRow = table.getRow(rowId - 1);
                if (!prevRow) return `No Δ Index: no prior year.`;

                const prevIdx = Number(prevRow.getData().idx); // Again using idx b/c that's the GDP index value

                if (!Number.isFinite(currIdx) || !Number.isFinite(prevIdx)) {
                    return `Δ Index unavailable (check index values).`;
                };

                const change = currIdx - prevIdx;

                // Tool tip text with substituded numbers and basic formula
                return `Δ Index is = ${currIdx.toFixed(2)} - ${prevIdx.toFixed(2)} = ${change.toFixed(2)} <br><br> (Current Year's Index - Previous Year's Index)`
            },
         },
    ]
});

// Recompute table and do so with new data if cells were altered by user

function applyRecompute() {
    // Get latest data from Tabulator -- do this in case the user changed some cells
    const current = table.getData();
    const next = recomputeRows(current, baseRowIdx);

    // Put new values back into the table
    table.updateData(next);
}

// Tabulator event -- once the table is built, run the recompute
table.on("tableBuilt", () => {
    applyRecompute();
});

// If the user selects a different baseYear, recompute!
table.on("rowSelected", function(row) {
    const data = row.getData();
    baseRowIdx = data.index;
    applyRecompute();
});

// If the user edits GDP, that should trigger the recompute
table.on("cellEdited", function (cell) {
    if (cell.getField() === "gdp") {
        applyRecompute();
    }
});