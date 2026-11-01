import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./browser-tests',fullyParallel:true,forbidOnly:!!process.env.CI,retries:0,
 use:{baseURL:'http://127.0.0.1:4173/guidecheck/',browserName:'chromium',trace:'retain-on-failure'},
 webServer:{command:'npm run dev -- --port 4173',url:'http://127.0.0.1:4173/guidecheck/',reuseExistingServer:!process.env.CI},
});
