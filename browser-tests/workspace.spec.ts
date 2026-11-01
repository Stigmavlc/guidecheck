import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test.beforeEach(async({page})=>{await page.goto('./');});
test('sample findings open the correct source line and filter by severity',async({page})=>{
 await page.getByRole('button',{name:/section reference Section 5/}).click();
 await expect(page.locator('.source-line.highlight')).toContainText('apartado 5');
 await expect(page.getByRole('status')).toContainText('line 13');
 await page.getByRole('button',{name:'Errors 2',exact:true}).click();
 await expect(page.locator('.finding')).toHaveCount(2);
 await page.getByRole('button',{name:'Warnings 4',exact:true}).click();
 await expect(page.locator('.finding')).toHaveCount(4);
});
test('document tabs work with arrow, Home and End keys',async({page})=>{
 const es=page.getByRole('tab',{name:'help.es.md ES'});await es.focus();await es.press('ArrowLeft');
 await expect(page.getByRole('tab',{name:'help.en.md EN'})).toBeFocused();
 await expect(page.getByRole('tabpanel')).toContainText('Booking desk guide');
 await page.getByRole('tab',{name:'help.en.md EN'}).press('End');await expect(es).toBeFocused();
 await es.press('Home');await expect(page.getByRole('tab',{name:'help.en.md EN'})).toBeFocused();
});
test('a new set clears old findings and can report a missing counterpart',async({page})=>{
 await page.locator('input[type=file]').first().setInputFiles({name:'start.en.md',mimeType:'text/markdown',buffer:Buffer.from('# Start')});
 await expect(page.getByText('Ready for a fresh check.')).toBeVisible();await expect(page.getByRole('button',{name:'JSON',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Run checks',exact:true}).click();
 await expect(page.locator('.finding')).toContainText('Pair needs both start.en.md and start.es.md.');
});
test('configuration errors clear results and disable stale exports',async({page})=>{
 await page.getByRole('button',{name:/Pairing & terminology/}).click();
 await page.getByLabel('Configuration JSON').fill('{');await page.getByRole('button',{name:'Run checks',exact:true}).click();
 await expect(page.getByRole('alert')).toHaveText('Configuration is not valid JSON.');await expect(page.getByRole('button',{name:'Report',exact:true})).toBeDisabled();
});
test('JSON and Markdown exports preserve the checked source and findings',async({page})=>{
 const jsonDownload=page.waitForEvent('download');await page.getByRole('button',{name:'JSON',exact:true}).click();const jsonFile=await jsonDownload;
 const json=JSON.parse(await readFile((await jsonFile.path())!,'utf8'));expect(json.documents).toHaveLength(2);expect(json.findings).toHaveLength(6);expect(json.scope).toContain('No translation quality');
 const mdDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Report',exact:true}).click();const mdFile=await mdDownload;
 expect(await readFile((await mdFile.path())!,'utf8')).toContain('help.es.md:13');
});
test('invalid UTF-8 and duplicate names do not replace the current set',async({page})=>{
 await page.locator('input[type=file]').first().setInputFiles({name:'bad.md',mimeType:'text/markdown',buffer:Buffer.from([255])});await expect(page.getByRole('alert')).toContainText('not valid UTF-8');
 await expect(page.getByRole('tab',{name:'help.es.md ES'})).toBeVisible();
 await page.locator('input[type=file]').first().setInputFiles([{name:'same.md',mimeType:'text/markdown',buffer:Buffer.from('# A')},{name:'same.md',mimeType:'text/markdown',buffer:Buffer.from('# B')}]);
 await expect(page.getByRole('alert')).toContainText('Duplicate path');await expect(page.locator('.finding')).toHaveCount(6);
});
test('HTML in a document stays source text rather than executable markup',async({page})=>{
 await page.locator('input[type=file]').first().setInputFiles({name:'source.md',mimeType:'text/markdown',buffer:Buffer.from('# Source\n<img src="https://example.invalid/private" onerror="window.bad=true">')});
 await expect(page.getByRole('tabpanel')).toContainText('<img');expect(await page.locator('.source-panel img').count()).toBe(0);
});
test('a clean bilingual set has no findings without claiming translation accuracy',async({page})=>{
 await page.locator('input[type=file]').first().setInputFiles([{name:'a.en.md',mimeType:'text/markdown',buffer:Buffer.from('# Guide\n## 1. Start')},{name:'a.es.md',mimeType:'text/markdown',buffer:Buffer.from('# Guía\n## 1. Inicio')}]);
 await page.getByRole('button',{name:'Run checks',exact:true}).click();await expect(page.getByText('No findings here.')).toBeVisible();
 await expect(page.getByText('This covers only the configured checks. A person still needs to review meaning, accuracy and translation.')).toBeVisible();
});
test('the mobile workspace fits without horizontal page overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await expect(page.getByRole('button',{name:'Run checks',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByRole('button',{name:/mapped section Expected one heading/}).click();await expect(page.getByRole('button',{name:'Close finding detail'})).toBeVisible();
});
