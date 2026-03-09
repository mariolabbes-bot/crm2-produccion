const { listUnprocessedFiles } = require('../src/services/googleDriveService');
async function test() {
    try {
        console.log("Checking folder 1qPyGG4hYSIgdYSQimFnYiBrubOYC6U_7...");
        const files = await listUnprocessedFiles('1qPyGG4hYSIgdYSQimFnYiBrubOYC6U_7');
        console.log("Files found: ", files.length);
        files.forEach(f => console.log(f.name));
    } catch(e) {
        console.error("Error:", e.message);
    }
}
test();
