const { runDriveImportCycle } = require('../src/services/importAutomation');
async function test() {
   await runDriveImportCycle();
}
test();
