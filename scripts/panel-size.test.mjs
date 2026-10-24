import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clampPanelShare} from '../src/panel-size.js';
test('panel divider preserves usable widths at both drag limits',()=>{
 for(const width of [720,1000,1800]){
  assert.equal(clampPanelShare(-100,width),260/width*100);
  assert.equal(clampPanelShare(200,width),(width-320)/width*100);
  assert.equal(clampPanelShare(40,width),40);
 }
});
