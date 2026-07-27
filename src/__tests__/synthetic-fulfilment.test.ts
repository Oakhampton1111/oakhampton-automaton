import {afterEach,describe,expect,it} from "vitest";
import fs from "node:fs";import os from "node:os";import path from "node:path";
import {executeSyntheticFulfilment} from "../commerce/synthetic-fulfilment.js";
const roots:string[]=[];const input:any={contractId:"synthetic-1",skillId:"software",scope:"Build a tested deterministic string normalization utility.",acceptance:["output is trimmed"],paymentVerified:true,customerFiles:[],maximumRevisions:1};
afterEach(()=>{for(const r of roots.splice(0))fs.rmSync(r,{recursive:true,force:true});});
describe("synthetic fulfilment execution",()=>{
 it("produces isolated checksummed artifacts and a manifest",()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),"fulfil-"));roots.push(root);const r=executeSyntheticFulfilment(input,root);expect(r.workspacePath.startsWith(root)).toBe(true);expect(r.artifactNames).toContain("solution.ts");expect(r.manifest.qualityScoreBps).toBe(9800);expect(fs.existsSync(path.join(r.workspacePath,"delivery-manifest.json"))).toBe(true);});
 it("requires verified payment before creating work",()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),"fulfil-"));roots.push(root);expect(()=>executeSyntheticFulfilment({...input,paymentVerified:false},root)).toThrow("PAYMENT_NOT_VERIFIED");});
 it.each(["research","data","website","documents"])("supports the %s production harness",(skillId)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),"fulfil-"));roots.push(root);const r=executeSyntheticFulfilment({...input,contractId:"x-"+skillId,skillId},root);expect(r.manifest.files.length).toBeGreaterThan(1);});
});
