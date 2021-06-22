const core = require('@actions/core');
const wait = require('./wait');
const puppeteer = require('puppeteer');

const child_process = require('child_process');


// most @actions toolkit packages have async methods
async function run() {
  try {

    // const url = core.getInput('url');
    const ms = core.getInput('url');
    core.info(`Waiting ${ms} milliseconds ...`);

    core.debug((new Date()).toTimeString()); // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true
    await wait(parseInt(0));
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://stackoverflow.com');
    await page.screenshot({ path: 'stubs/image.png' });

    await browser.close();

    const { stdout } = child_process.spawnSync("npm" , ['run','test']);
    core.info(stdout);
  
    core.info((new Date()).toTimeString());

    core.setOutput('time', new Date().toTimeString());
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
